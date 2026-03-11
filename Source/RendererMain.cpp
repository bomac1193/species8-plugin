#include <juce_audio_formats/juce_audio_formats.h>
#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_core/juce_core.h>
#include <algorithm>
#include <iostream>
#include "PluginProcessor.h"

namespace
{

constexpr int renderBlockSize = 512;

juce::File makeOutputFile(const juce::String& jobId)
{
    auto tmpDir = juce::File::getSpecialLocation(juce::File::tempDirectory);
    return tmpDir.getChildFile("species8-" + jobId + ".wav");
}

void sendStatus(const juce::String& id, const juce::String& status, const juce::String& message = {},
                double progress = -1.0, const juce::String& path = {})
{
    auto payload = juce::DynamicObject::Ptr(new juce::DynamicObject());
    payload->setProperty("id", id);
    payload->setProperty("status", status);
    if (message.isNotEmpty())
        payload->setProperty("message", message);
    if (progress >= 0.0)
        payload->setProperty("progress", progress);
    if (path.isNotEmpty())
        payload->setProperty("renderPath", path);

    const auto json = juce::JSON::toString(juce::var(payload));
    std::cout << json << std::endl;
    std::cout.flush();
}

bool renderFile(const juce::File& source, const juce::File& destination, Species8AudioProcessor& processor,
                juce::AudioFormatManager& formatManager)
{
    std::unique_ptr<juce::AudioFormatReader> reader(formatManager.createReaderFor(source));
    if (reader == nullptr)
        return false;

    auto inputChannels = (int) reader->numChannels;
    auto outputChannels = juce::jmax(processor.getTotalNumOutputChannels(), inputChannels);

    juce::AudioBuffer<float> readBuffer(inputChannels > 0 ? inputChannels : 1, renderBlockSize);
    juce::AudioBuffer<float> processBuffer(outputChannels, renderBlockSize);
    juce::MidiBuffer midi;

    processor.setNonRealtime(true);
    processor.prepareToPlay(reader->sampleRate, renderBlockSize);

    juce::WavAudioFormat wavFormat;
    std::unique_ptr<juce::FileOutputStream> outStream(destination.createOutputStream());
    if (outStream == nullptr)
        return false;

    std::unique_ptr<juce::AudioFormatWriter> writer(
        wavFormat.createWriterFor(outStream.release(), reader->sampleRate, (unsigned int) outputChannels, 24, {}, 0));
    if (writer == nullptr)
        return false;

    const auto totalSamples = reader->lengthInSamples;
    juce::int64 samplesRemaining = totalSamples;
    juce::int64 readPosition = 0;
    double lastProgress = 0.0;

    while (samplesRemaining > 0)
    {
        const auto numThisBlock =
            (int) std::min<juce::int64>(static_cast<juce::int64>(renderBlockSize), samplesRemaining);
        readBuffer.clear();
        reader->read(&readBuffer, 0, numThisBlock, readPosition, true, inputChannels > 1);
        processBuffer.clear();

        for (int ch = 0; ch < outputChannels; ++ch)
        {
            auto sourceChannel = juce::jmin(ch, readBuffer.getNumChannels() - 1);
            processBuffer.copyFrom(ch, 0, readBuffer, sourceChannel, 0, numThisBlock);
        }

        processor.processBlock(processBuffer, midi);
        writer->writeFromAudioSampleBuffer(processBuffer, 0, numThisBlock);

        readPosition += numThisBlock;
        samplesRemaining -= numThisBlock;

        const auto progress = juce::jlimit(0.0, 1.0, (double) readPosition / (double) totalSamples);
        if (progress - lastProgress >= 0.05)
        {
            lastProgress = progress;
            // Progress updates are sent by the caller.
        }
    }

    processor.releaseResources();
    writer.reset();
    return true;
}

}

int main()
{
    juce::ScopedJuceInitialiser_GUI juceInit;
    juce::AudioFormatManager formatManager;
    formatManager.registerBasicFormats();

    std::string inputLine;
    while (std::getline(std::cin, inputLine))
    {
        juce::String line(inputLine);
        line = line.trim();
        if (line.isEmpty())
            continue;

        auto parsed = juce::JSON::parse(line);
        if (!parsed.isObject())
        {
            sendStatus({}, "error", "Invalid JSON payload");
            continue;
        }

        auto* obj = parsed.getDynamicObject();
        const auto id = obj->getProperty("id").toString();
        if (id.isEmpty())
        {
            sendStatus({}, "error", "Job missing id");
            continue;
        }

        const auto* refs = obj->getProperty("references").getArray();
        if (refs == nullptr || refs->isEmpty())
        {
            sendStatus(id, "error", "No reference provided");
            continue;
        }

        const auto sourcePath = refs->getFirst().toString();
        const juce::File sourceFile(sourcePath);
        if (!sourceFile.existsAsFile())
        {
            sendStatus(id, "error", "Reference not found: " + sourcePath);
            continue;
        }

        const auto destination = makeOutputFile(id);
        Species8AudioProcessor processor;

        sendStatus(id, "rendering", {}, 0.0);
        const auto success = renderFile(sourceFile, destination, processor, formatManager);
        if (!success)
        {
            sendStatus(id, "error", "Rendering failed");
            continue;
        }

        sendStatus(id, "ready", {}, 1.0, destination.getFullPathName());
    }

    return 0;
}

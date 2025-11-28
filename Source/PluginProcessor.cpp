/*
  ==============================================================================
    PluginProcessor.cpp
    Part of Species 8 - Sound Design Plugin
  ==============================================================================
*/

#include "PluginProcessor.h"
#include "PluginEditor.h"

//==============================================================================
Species8AudioProcessor::Species8AudioProcessor()
#ifndef JucePlugin_PreferredChannelConfigurations
     : AudioProcessor (BusesProperties()
                     #if ! JucePlugin_IsMidiEffect
                      #if ! JucePlugin_IsSynth
                       .withInput  ("Input",  juce::AudioChannelSet::stereo(), true)
                      #endif
                       .withOutput ("Output", juce::AudioChannelSet::stereo(), true)
                     #endif
                       ),
#else
    :
#endif
      parameters (*this, nullptr, juce::Identifier ("Species8Parameters"), createParameterLayout())
{
    // Register audio formats
    formatManager.registerBasicFormats();

    // Get pointers to parameters for efficient access
    dryWetParam = parameters.getRawParameterValue ("dryWet");
    outputGainParam = parameters.getRawParameterValue ("outputGain");
    bypassParam = parameters.getRawParameterValue ("bypass");
    mudAmountParam = parameters.getRawParameterValue ("mudAmount");
    brightnessAmountParam = parameters.getRawParameterValue ("brightnessAmount");
    widthAmountParam = parameters.getRawParameterValue ("widthAmount");
    spaceAmountParam = parameters.getRawParameterValue ("spaceAmount");
}

Species8AudioProcessor::~Species8AudioProcessor()
{
}

//==============================================================================
juce::AudioProcessorValueTreeState::ParameterLayout Species8AudioProcessor::createParameterLayout()
{
    juce::AudioProcessorValueTreeState::ParameterLayout layout;

    layout.add (std::make_unique<juce::AudioParameterFloat> (
        "dryWet",
        "Dry/Wet",
        juce::NormalisableRange<float> (0.0f, 1.0f, 0.01f),
        0.5f,
        juce::String(),
        juce::AudioProcessorParameter::genericParameter,
        [](float value, int) { return juce::String (static_cast<int> (value * 100.0f)) + "%"; }));

    layout.add (std::make_unique<juce::AudioParameterFloat> (
        "outputGain",
        "Output Gain",
        juce::NormalisableRange<float> (-24.0f, 24.0f, 0.1f),
        0.0f,
        juce::String(),
        juce::AudioProcessorParameter::genericParameter,
        [](float value, int) { return juce::String (value, 1) + " dB"; }));

    layout.add (std::make_unique<juce::AudioParameterBool> (
        "bypass",
        "Bypass",
        false));

    layout.add (std::make_unique<juce::AudioParameterFloat> (
        "mudAmount",
        "Mud Reduction",
        juce::NormalisableRange<float> (0.0f, 1.0f, 0.01f),
        0.3f));

    layout.add (std::make_unique<juce::AudioParameterFloat> (
        "brightnessAmount",
        "Brightness",
        juce::NormalisableRange<float> (0.0f, 1.0f, 0.01f),
        0.5f));

    layout.add (std::make_unique<juce::AudioParameterFloat> (
        "widthAmount",
        "Stereo Width",
        juce::NormalisableRange<float> (0.0f, 1.0f, 0.01f),
        0.5f));

    layout.add (std::make_unique<juce::AudioParameterFloat> (
        "spaceAmount",
        "Space/Reverb",
        juce::NormalisableRange<float> (0.0f, 1.0f, 0.01f),
        0.2f));

    return layout;
}

//==============================================================================
const juce::String Species8AudioProcessor::getName() const
{
    return JucePlugin_Name;
}

bool Species8AudioProcessor::acceptsMidi() const
{
   #if JucePlugin_WantsMidiInput
    return true;
   #else
    return false;
   #endif
}

bool Species8AudioProcessor::producesMidi() const
{
   #if JucePlugin_ProducesMidiOutput
    return true;
   #else
    return false;
   #endif
}

bool Species8AudioProcessor::isMidiEffect() const
{
   #if JucePlugin_IsMidiEffect
    return true;
   #else
    return false;
   #endif
}

double Species8AudioProcessor::getTailLengthSeconds() const
{
    return 2.0; // Reverb tail
}

int Species8AudioProcessor::getNumPrograms()
{
    return 1;
}

int Species8AudioProcessor::getCurrentProgram()
{
    return 0;
}

void Species8AudioProcessor::setCurrentProgram (int index)
{
    juce::ignoreUnused (index);
}

const juce::String Species8AudioProcessor::getProgramName (int index)
{
    juce::ignoreUnused (index);
    return {};
}

void Species8AudioProcessor::changeProgramName (int index, const juce::String& newName)
{
    juce::ignoreUnused (index, newName);
}

//==============================================================================
void Species8AudioProcessor::prepareToPlay (double sampleRate, int samplesPerBlock)
{
    juce::dsp::ProcessSpec spec;
    spec.sampleRate = sampleRate;
    spec.maximumBlockSize = static_cast<juce::uint32> (samplesPerBlock);
    spec.numChannels = static_cast<juce::uint32> (getTotalNumOutputChannels());

    dspChain.prepare (spec);
    dryWetMixer.prepare (spec);

    outputGainSmoothed.reset (sampleRate, 0.05);

    updateDSPFromParameters();
}

void Species8AudioProcessor::releaseResources()
{
    dspChain.reset();
    dryWetMixer.reset();
}

#ifndef JucePlugin_PreferredChannelConfigurations
bool Species8AudioProcessor::isBusesLayoutSupported (const BusesLayout& layouts) const
{
  #if JucePlugin_IsMidiEffect
    juce::ignoreUnused (layouts);
    return true;
  #else
    // Support mono and stereo
    if (layouts.getMainOutputChannelSet() != juce::AudioChannelSet::mono()
     && layouts.getMainOutputChannelSet() != juce::AudioChannelSet::stereo())
        return false;

    // Input and output layouts must match
   #if ! JucePlugin_IsSynth
    if (layouts.getMainOutputChannelSet() != layouts.getMainInputChannelSet())
        return false;
   #endif

    return true;
  #endif
}
#endif

void Species8AudioProcessor::processBlock (juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midiMessages)
{
    juce::ignoreUnused (midiMessages);
    juce::ScopedNoDenormals noDenormals;

    auto totalNumInputChannels  = getTotalNumInputChannels();
    auto totalNumOutputChannels = getTotalNumOutputChannels();

    // Clear any extra output channels
    for (auto i = totalNumInputChannels; i < totalNumOutputChannels; ++i)
        buffer.clear (i, 0, buffer.getNumSamples());

    // Check bypass
    if (bypassParam->load() > 0.5f)
        return;

    // Update DSP parameters from current parameter values
    updateDSPFromParameters();

    // Create audio block
    juce::dsp::AudioBlock<float> block (buffer);
    juce::dsp::ProcessContextReplacing<float> context (block);

    // Push dry signal to mixer
    dryWetMixer.pushDrySamples (block);

    // Process through DSP chain
    dspChain.process (context);

    // Mix dry and wet based on parameter
    dryWetMixer.setWetMixProportion (dryWetParam->load());
    dryWetMixer.mixWetSamples (block);

    // Apply output gain
    auto gainDB = outputGainParam->load();
    auto gainLinear = juce::Decibels::decibelsToGain (gainDB);
    outputGainSmoothed.setTargetValue (gainLinear);

    for (int channel = 0; channel < totalNumOutputChannels; ++channel)
    {
        auto* channelData = buffer.getWritePointer (channel);

        for (int sample = 0; sample < buffer.getNumSamples(); ++sample)
        {
            channelData[sample] *= outputGainSmoothed.getNextValue();
        }
    }
}

//==============================================================================
void Species8AudioProcessor::updateDSPFromParameters()
{
    // Update high-pass filter (mud reduction)
    auto mudAmount = mudAmountParam->load();
    auto hpFreq = 20.0f + mudAmount * 180.0f; // 20Hz to 200Hz
    auto& highPass = dspChain.get<HighPassFilter>();
    highPass.coefficients = juce::dsp::IIR::Coefficients<float>::makeHighPass (
        getSampleRate(), hpFreq, 0.707f);

    // Update high-shelf filter (brightness)
    auto brightnessAmount = brightnessAmountParam->load();
    auto shelfGainDB = (brightnessAmount - 0.5f) * 12.0f; // -6dB to +6dB
    auto& highShelf = dspChain.get<HighShelfFilter>();
    highShelf.coefficients = juce::dsp::IIR::Coefficients<float>::makeHighShelf (
        getSampleRate(), 4000.0f, 0.707f, juce::Decibels::decibelsToGain (shelfGainDB));

    // Update stereo width
    auto widthAmount = widthAmountParam->load();
    auto widthValue = widthAmount * 2.0f; // 0.0 (mono) to 2.0 (wide)
    auto& widthProc = dspChain.get<StereoWidth>();
    widthProc.setWidth (widthValue);

    // Update reverb
    auto spaceAmount = spaceAmountParam->load();
    auto& reverb = dspChain.get<ReverbEffect>();
    juce::Reverb::Parameters reverbParams;
    reverbParams.roomSize = 0.5f + spaceAmount * 0.5f;
    reverbParams.damping = 0.5f;
    reverbParams.wetLevel = spaceAmount * 0.4f; // Max 40% wet
    reverbParams.dryLevel = 1.0f - spaceAmount * 0.4f;
    reverbParams.width = 1.0f;
    reverbParams.freezeMode = 0.0f;
    reverb.setParameters (reverbParams);
}

//==============================================================================
void Species8AudioProcessor::updateParametersFromPrompt (const juce::String& promptText)
{
    auto prompt = promptText.toLowerCase();

    // Width keywords
    if (prompt.contains ("wider") || prompt.contains ("wide") || prompt.contains ("8d"))
    {
        widthAmountParam->store (juce::jmin (widthAmountParam->load() + 0.2f, 1.0f));
    }
    if (prompt.contains ("narrow") || prompt.contains ("mono"))
    {
        widthAmountParam->store (juce::jmax (widthAmountParam->load() - 0.2f, 0.0f));
    }

    // Mud/clarity keywords
    if (prompt.contains ("less muddy") || prompt.contains ("clearer") ||
        prompt.contains ("clean") || prompt.contains ("clarity"))
    {
        mudAmountParam->store (juce::jmin (mudAmountParam->load() + 0.2f, 1.0f));
    }
    if (prompt.contains ("more muddy") || prompt.contains ("muddy") || prompt.contains ("warm"))
    {
        mudAmountParam->store (juce::jmax (mudAmountParam->load() - 0.2f, 0.0f));
    }

    // Brightness keywords
    if (prompt.contains ("brighter") || prompt.contains ("bright") ||
        prompt.contains ("crisp") || prompt.contains ("shine"))
    {
        brightnessAmountParam->store (juce::jmin (brightnessAmountParam->load() + 0.2f, 1.0f));
    }
    if (prompt.contains ("darker") || prompt.contains ("dark") || prompt.contains ("dull"))
    {
        brightnessAmountParam->store (juce::jmax (brightnessAmountParam->load() - 0.2f, 0.0f));
    }

    // Space/reverb keywords
    if (prompt.contains ("space") || prompt.contains ("reverb") ||
        prompt.contains ("plastic") || prompt.contains ("high-tech"))
    {
        spaceAmountParam->store (juce::jmin (spaceAmountParam->load() + 0.2f, 1.0f));
    }
    if (prompt.contains ("dry") || prompt.contains ("intimate") || prompt.contains ("close"))
    {
        spaceAmountParam->store (juce::jmax (spaceAmountParam->load() - 0.2f, 0.0f));
    }

    // Update DSP immediately
    updateDSPFromParameters();
}

//==============================================================================
bool Species8AudioProcessor::loadAudioFile (const juce::File& file)
{
    std::unique_ptr<juce::AudioFormatReader> reader (formatManager.createReaderFor (file));

    if (reader != nullptr)
    {
        auto sampleRate = reader->sampleRate;
        auto numChannels = static_cast<int> (reader->numChannels);
        auto lengthInSamples = static_cast<int> (reader->lengthInSamples);

        loadedSampleBuffer.setSize (numChannels, lengthInSamples);
        reader->read (&loadedSampleBuffer, 0, lengthInSamples, 0, true, true);

        loadedSampleRate = sampleRate;
        sampleLoaded = true;

        return true;
    }

    return false;
}

//==============================================================================
bool Species8AudioProcessor::hasEditor() const
{
    return true;
}

juce::AudioProcessorEditor* Species8AudioProcessor::createEditor()
{
    return new Species8AudioProcessorEditor (*this);
}

//==============================================================================
void Species8AudioProcessor::getStateInformation (juce::MemoryBlock& destData)
{
    auto state = parameters.copyState();
    std::unique_ptr<juce::XmlElement> xml (state.createXml());
    copyXmlToBinary (*xml, destData);
}

void Species8AudioProcessor::setStateInformation (const void* data, int sizeInBytes)
{
    std::unique_ptr<juce::XmlElement> xmlState (getXmlFromBinary (data, sizeInBytes));

    if (xmlState.get() != nullptr)
        if (xmlState->hasTagName (parameters.state.getType()))
            parameters.replaceState (juce::ValueTree::fromXml (*xmlState));
}

//==============================================================================
// This creates new instances of the plugin..
juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter()
{
    return new Species8AudioProcessor();
}

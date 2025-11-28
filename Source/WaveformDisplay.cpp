/*
  ==============================================================================
    WaveformDisplay.cpp
    Part of Species 8 - Sound Design Plugin
  ==============================================================================
*/

#include "WaveformDisplay.h"

WaveformDisplay::WaveformDisplay()
{
    startTimerHz (30); // 30 FPS refresh
}

WaveformDisplay::~WaveformDisplay()
{
    stopTimer();
}

void WaveformDisplay::setAudioBuffer (const juce::AudioBuffer<float>& buffer, double sr)
{
    audioBuffer = buffer;
    sampleRate = sr;
    hasAudio = (buffer.getNumSamples() > 0);

    generateWaveformPath();
    repaint();
}

void WaveformDisplay::clear()
{
    audioBuffer.setSize (0, 0);
    hasAudio = false;
    waveformPath.clear();
    repaint();
}

void WaveformDisplay::paint (juce::Graphics& g)
{
    auto bounds = getLocalBounds().toFloat();

    // Background
    g.setColour (juce::Colour (0xff1a1a2e));
    g.fillRoundedRectangle (bounds, 8.0f);

    // Border
    g.setColour (juce::Colour (0xff3d3d5c));
    g.drawRoundedRectangle (bounds.reduced (1.0f), 8.0f, 2.0f);

    if (!hasAudio)
    {
        // Placeholder text
        g.setColour (juce::Colour (0xff6b6b8f));
        g.setFont (16.0f);
        g.drawText ("Drop a sound here", bounds, juce::Justification::centred);
    }
    else
    {
        // Draw waveform
        juce::ScopedLock lock (pathLock);

        g.setColour (juce::Colour (0xff9f7bff).withAlpha (0.2f));
        g.fillPath (waveformPath);

        g.setColour (juce::Colour (0xff9f7bff));
        g.strokePath (waveformPath, juce::PathStrokeType (2.0f));
    }
}

void WaveformDisplay::resized()
{
    if (hasAudio)
        generateWaveformPath();
}

void WaveformDisplay::timerCallback()
{
    // Optional: Add animation or real-time updates here
}

void WaveformDisplay::generateWaveformPath()
{
    if (!hasAudio || audioBuffer.getNumSamples() == 0)
        return;

    juce::ScopedLock lock (pathLock);
    waveformPath.clear();

    auto bounds = getLocalBounds().reduced (10).toFloat();
    auto width = bounds.getWidth();
    auto height = bounds.getHeight();
    auto centerY = bounds.getCentreY();

    auto numSamples = audioBuffer.getNumSamples();
    auto numChannels = audioBuffer.getNumChannels();

    // Calculate samples per pixel
    auto samplesPerPixel = juce::jmax (1, numSamples / static_cast<int> (width));

    // Start path
    waveformPath.startNewSubPath (bounds.getX(), centerY);

    for (int x = 0; x < static_cast<int> (width); ++x)
    {
        auto sampleIndex = x * samplesPerPixel;

        if (sampleIndex >= numSamples)
            break;

        // Calculate min and max for this pixel
        float minVal = 1.0f;
        float maxVal = -1.0f;

        for (int i = 0; i < samplesPerPixel && (sampleIndex + i) < numSamples; ++i)
        {
            for (int ch = 0; ch < numChannels; ++ch)
            {
                auto sample = audioBuffer.getSample (ch, sampleIndex + i);
                minVal = juce::jmin (minVal, sample);
                maxVal = juce::jmax (maxVal, sample);
            }
        }

        // Convert to pixel coordinates
        auto minY = centerY - (maxVal * height * 0.45f);
        auto maxY = centerY - (minVal * height * 0.45f);

        // Add to path
        auto xPos = bounds.getX() + x;
        waveformPath.lineTo (xPos, minY);
        waveformPath.lineTo (xPos, maxY);
    }

    waveformPath.lineTo (bounds.getRight(), centerY);
}

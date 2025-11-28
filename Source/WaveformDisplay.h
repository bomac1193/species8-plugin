/*
  ==============================================================================
    WaveformDisplay.h
    Part of Species 8 - Sound Design Plugin

    Component for displaying audio waveform
  ==============================================================================
*/

#pragma once

#include <juce_gui_basics/juce_gui_basics.h>
#include <juce_audio_basics/juce_audio_basics.h>

/**
 * @brief Component that displays an audio waveform
 *
 * Shows a visual representation of an audio buffer, with
 * placeholder text when no audio is loaded.
 */
class WaveformDisplay : public juce::Component,
                        private juce::Timer
{
public:
    WaveformDisplay();
    ~WaveformDisplay() override;

    /**
     * @brief Set the audio buffer to display
     * @param buffer Audio buffer containing the waveform data
     * @param sampleRate Sample rate of the audio
     */
    void setAudioBuffer (const juce::AudioBuffer<float>& buffer, double sampleRate);

    /**
     * @brief Clear the waveform display
     */
    void clear();

    void paint (juce::Graphics& g) override;
    void resized() override;

private:
    void timerCallback() override;
    void generateWaveformPath();

    juce::AudioBuffer<float> audioBuffer;
    double sampleRate = 44100.0;
    bool hasAudio = false;

    juce::Path waveformPath;
    juce::CriticalSection pathLock;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (WaveformDisplay)
};

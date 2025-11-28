/*
  ==============================================================================
    PluginProcessor.h
    Part of Species 8 - Sound Design Plugin

    Main audio processor with prompt-driven DSP chain
  ==============================================================================
*/

#pragma once

#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_dsp/juce_dsp.h>
#include <juce_audio_formats/juce_audio_formats.h>
#include "StereoWidthProcessor.h"

//==============================================================================
/**
 * @brief Main audio processor for Species 8 plugin
 *
 * Features:
 * - Prompt-driven DSP parameter control
 * - Audio file loading for visualization
 * - Multi-stage DSP chain (filters, width, reverb)
 * - Dry/wet mixing and bypass
 */
class Species8AudioProcessor : public juce::AudioProcessor
{
public:
    //==============================================================================
    Species8AudioProcessor();
    ~Species8AudioProcessor() override;

    //==============================================================================
    void prepareToPlay (double sampleRate, int samplesPerBlock) override;
    void releaseResources() override;

   #ifndef JucePlugin_PreferredChannelConfigurations
    bool isBusesLayoutSupported (const BusesLayout& layouts) const override;
   #endif

    void processBlock (juce::AudioBuffer<float>&, juce::MidiBuffer&) override;

    //==============================================================================
    juce::AudioProcessorEditor* createEditor() override;
    bool hasEditor() const override;

    //==============================================================================
    const juce::String getName() const override;

    bool acceptsMidi() const override;
    bool producesMidi() const override;
    bool isMidiEffect() const override;
    double getTailLengthSeconds() const override;

    //==============================================================================
    int getNumPrograms() override;
    int getCurrentProgram() override;
    void setCurrentProgram (int index) override;
    const juce::String getProgramName (int index) override;
    void changeProgramName (int index, const juce::String& newName) override;

    //==============================================================================
    void getStateInformation (juce::MemoryBlock& destData) override;
    void setStateInformation (const void* data, int sizeInBytes) override;

    //==============================================================================
    // Custom methods for Species 8

    /**
     * @brief Parse text prompt and update DSP parameters accordingly
     * @param promptText User's text prompt (e.g. "wider, less muddy, brighter")
     */
    void updateParametersFromPrompt (const juce::String& promptText);

    /**
     * @brief Load an audio file into the internal buffer for visualization
     * @param file Audio file to load
     * @return true if successful
     */
    bool loadAudioFile (const juce::File& file);

    /**
     * @brief Get the loaded sample buffer for waveform display
     */
    const juce::AudioBuffer<float>& getLoadedSampleBuffer() const { return loadedSampleBuffer; }

    /**
     * @brief Get the sample rate of the loaded file
     */
    double getLoadedSampleRate() const { return loadedSampleRate; }

    /**
     * @brief Check if a sample is currently loaded
     */
    bool isSampleLoaded() const { return sampleLoaded; }

    // Access to parameter state
    juce::AudioProcessorValueTreeState& getValueTreeState() { return parameters; }

private:
    //==============================================================================
    // DSP Chain components
    using FilterType = juce::dsp::IIR::Filter<float>;

    enum ChainPositions
    {
        HighPassFilter,
        HighShelfFilter,
        StereoWidth,
        ReverbEffect
    };

    juce::dsp::ProcessorChain<FilterType, FilterType, StereoWidthProcessor, juce::dsp::Reverb> dspChain;

    // Dry/wet mixing
    juce::dsp::DryWetMixer<float> dryWetMixer;

    // Audio format manager for loading files
    juce::AudioFormatManager formatManager;

    // Loaded sample buffer and info
    juce::AudioBuffer<float> loadedSampleBuffer;
    double loadedSampleRate = 0.0;
    bool sampleLoaded = false;

    // Parameter state
    juce::AudioProcessorValueTreeState parameters;

    // Atomic parameters for thread-safe access
    std::atomic<float>* dryWetParam = nullptr;
    std::atomic<float>* outputGainParam = nullptr;
    std::atomic<float>* bypassParam = nullptr;
    std::atomic<float>* mudAmountParam = nullptr;
    std::atomic<float>* brightnessAmountParam = nullptr;
    std::atomic<float>* widthAmountParam = nullptr;
    std::atomic<float>* spaceAmountParam = nullptr;

    // Smoothed output gain
    juce::SmoothedValue<float> outputGainSmoothed;

    // Helper methods
    juce::AudioProcessorValueTreeState::ParameterLayout createParameterLayout();
    void updateDSPFromParameters();

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (Species8AudioProcessor)
};

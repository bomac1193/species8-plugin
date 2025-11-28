/*
  ==============================================================================
    StereoWidthProcessor.h
    Part of Species 8 - Sound Design Plugin

    Custom DSP module for stereo width control using M/S encoding
  ==============================================================================
*/

#pragma once

#include <juce_dsp/juce_dsp.h>

/**
 * @brief Stereo width processor using Mid/Side encoding
 *
 * Converts L/R to M/S, scales the Side channel by a width parameter,
 * then converts back to L/R. Width > 1.0 increases stereo width,
 * width < 1.0 decreases it, and width = 0.0 produces mono.
 */
class StereoWidthProcessor
{
public:
    StereoWidthProcessor() = default;

    void prepare (const juce::dsp::ProcessSpec& spec)
    {
        sampleRate = spec.sampleRate;
        width.reset (sampleRate, 0.05); // 50ms smoothing
    }

    void reset()
    {
        width.reset(sampleRate, 0.05);
    }

    /**
     * @brief Set the stereo width amount
     * @param newWidth Width multiplier (0.0 = mono, 1.0 = normal, 2.0 = extra wide)
     */
    void setWidth (float newWidth)
    {
        width.setTargetValue (juce::jlimit (0.0f, 2.0f, newWidth));
    }

    template <typename ProcessContext>
    void process (const ProcessContext& context)
    {
        auto& outputBlock = context.getOutputBlock();

        // Only process stereo signals
        if (outputBlock.getNumChannels() < 2)
            return;

        auto numSamples = outputBlock.getNumSamples();
        auto* leftChannel = outputBlock.getChannelPointer (0);
        auto* rightChannel = outputBlock.getChannelPointer (1);

        for (size_t i = 0; i < numSamples; ++i)
        {
            auto left = leftChannel[i];
            auto right = rightChannel[i];

            // Convert L/R to M/S
            auto mid = (left + right) * 0.5f;
            auto side = (left - right) * 0.5f;

            // Apply width to side channel
            auto currentWidth = width.getNextValue();
            side *= currentWidth;

            // Convert M/S back to L/R
            leftChannel[i] = mid + side;
            rightChannel[i] = mid - side;
        }
    }

private:
    double sampleRate = 44100.0;
    juce::SmoothedValue<float> width { 1.0f };

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (StereoWidthProcessor)
};

/*
  ==============================================================================
    BinauralSpatializer.h
    Part of Species 8 - Sound Design Plugin

    Lightweight binaural "8D" spatial processor with orbiting motion, ITD/ILD
  ==============================================================================
*/

#pragma once

#include <juce_dsp/juce_dsp.h>

/**
 * @brief Creates a perceptual "8D" orbiting effect using simple binaural cues
 *
 * Features:
 *  - Motion-controlled interaural time difference via delay lines
 *  - Interaural level difference & head-shadow filtering
 *  - Crossfeed and elevation modulation for additional depth
 *
 * The processor exposes a single spatialAmount parameter which fades between
 * bypass (0.0) and full orbiting motion (1.0).
 */
class BinauralSpatializer
{
public:
    BinauralSpatializer() = default;

    void prepare (const juce::dsp::ProcessSpec& spec)
    {
        sampleRate = spec.sampleRate;
        leftDelay.reset();
        rightDelay.reset();
        leftDelay.setDelay (baseDelaySamples);
        rightDelay.setDelay (baseDelaySamples);
        amount.reset (sampleRate, 0.15);
        amount.setCurrentAndTargetValue (0.0f);
        phase = 0.0f;
    }

    void reset()
    {
        leftDelay.reset();
        rightDelay.reset();
        amount.reset (sampleRate, 0.15);
        phase = 0.0f;
    }

    /**
     * @brief Set how intense the binaural motion should be (0.0 - 1.0)
     */
    void setSpatialAmount (float newAmount)
    {
        amount.setTargetValue (juce::jlimit (0.0f, 1.0f, newAmount));
    }

    template <typename ProcessContext>
    void process (const ProcessContext& context)
    {
        auto& block = context.getOutputBlock();

        if (block.getNumChannels() < 2)
            return;

        auto* left = block.getChannelPointer (0);
        auto* right = block.getChannelPointer (1);
        auto numSamples = block.getNumSamples();

        for (size_t i = 0; i < numSamples; ++i)
        {
            auto currentAmount = amount.getNextValue();

            if (currentAmount <= 0.0005f)
                continue;

            auto motionDepth = juce::jmap (currentAmount, 0.0f, 1.0f, 0.1f, 1.0f);
            auto speedHz = juce::jmap (currentAmount, 0.0f, 1.0f, 0.05f, 1.35f);

            phase += (speedHz * juce::MathConstants<float>::twoPi) / static_cast<float> (sampleRate);
            if (phase > juce::MathConstants<float>::twoPi)
                phase -= juce::MathConstants<float>::twoPi;

            auto orbit = std::sin (phase);
            auto elevation = std::cos (phase * 0.5f);
            auto motion = orbit * motionDepth;

            auto itdSamples = motion * maxITDSamples;
            auto leftDelaySamples = baseDelaySamples + juce::jmax (0.0f, -itdSamples);
            auto rightDelaySamples = baseDelaySamples + juce::jmax (0.0f, itdSamples);

            auto dryLeft = left[i];
            auto dryRight = right[i];

            auto binauralLeft = leftDelay.popSample (0, leftDelaySamples);
            auto binauralRight = rightDelay.popSample (0, rightDelaySamples);

            leftDelay.pushSample (0, dryLeft);
            rightDelay.pushSample (0, dryRight);

            auto leftHeadShadow = juce::jmap (-motion, -1.0f, 1.0f, 0.55f, 1.0f);
            auto rightHeadShadow = juce::jmap (motion, -1.0f, 1.0f, 0.55f, 1.0f);

            auto elevationBlend = juce::jmap (elevation, -1.0f, 1.0f, 0.85f, 1.15f);
            auto crossfeedAmount = 0.15f * currentAmount;

            binauralLeft = (binauralLeft * leftHeadShadow * elevationBlend)
                         + (dryRight * crossfeedAmount);
            binauralRight = (binauralRight * rightHeadShadow / elevationBlend)
                          + (dryLeft * crossfeedAmount);

            left[i] = juce::jmap (currentAmount, 0.0f, 1.0f, dryLeft, binauralLeft);
            right[i] = juce::jmap (currentAmount, 0.0f, 1.0f, dryRight, binauralRight);
        }
    }

private:
    static constexpr float maxITDSamples = 20.0f;   // ~0.45ms max delay for ITD
    static constexpr float baseDelaySamples = 5.0f; // prevents denormals in delay line

    double sampleRate = 44100.0;
    float phase = 0.0f;

    juce::SmoothedValue<float> amount { 0.0f };
    juce::dsp::DelayLine<float, juce::dsp::DelayLineInterpolationTypes::Linear> leftDelay { 9600 };
    juce::dsp::DelayLine<float, juce::dsp::DelayLineInterpolationTypes::Linear> rightDelay { 9600 };

    JUCE_LEAK_DETECTOR (BinauralSpatializer)
};

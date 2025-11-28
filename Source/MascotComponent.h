/*
  ==============================================================================
    MascotComponent.h
    Part of Species 8 - Sound Design Plugin

    "The Mutant" - Animated alien mascot that reacts to audio and prompts
  ==============================================================================
*/

#pragma once

#include <juce_gui_basics/juce_gui_basics.h>
#include <juce_audio_basics/juce_audio_basics.h>

/**
 * @brief Animated alien mascot component
 *
 * Features:
 * - Morphs and glows based on audio/prompts
 * - Tentacle-like waveform extensions
 * - Bioluminescent effects
 * - Smooth animations
 */
class MascotComponent : public juce::Component,
                        private juce::Timer
{
public:
    MascotComponent()
    {
        startTimerHz (30); // 30 FPS animation
    }

    ~MascotComponent() override
    {
        stopTimer();
    }

    void paint (juce::Graphics& g) override
    {
        auto bounds = getLocalBounds().toFloat();
        auto centerX = bounds.getCentreX();
        auto centerY = bounds.getCentreY();
        auto size = juce::jmin (bounds.getWidth(), bounds.getHeight()) * 0.8f;

        // Outer glow aura
        g.setGradientFill (juce::ColourGradient (
            juce::Colour (0x409f7bff), centerX, centerY,
            juce::Colour (0x00000000), centerX, centerY - size * 0.7f,
            true));
        g.fillEllipse (centerX - size * 0.6f, centerY - size * 0.6f, size * 1.2f, size * 1.2f);

        // Draw tentacles (waveform-like)
        drawTentacles (g, centerX, centerY, size);

        // Main body (pulsating orb)
        auto pulseSize = size * 0.3f * (1.0f + pulseAmount * 0.2f);

        // Inner glow
        g.setGradientFill (juce::ColourGradient (
            juce::Colour (0x8052e9ff), centerX, centerY,
            juce::Colour (0x209f7bff), centerX, centerY - pulseSize,
            true));
        g.fillEllipse (centerX - pulseSize, centerY - pulseSize, pulseSize * 2, pulseSize * 2);

        // Core body
        g.setGradientFill (juce::ColourGradient (
            juce::Colour (0xff9f7bff), centerX, centerY - pulseSize * 0.3f,
            juce::Colour (0xff52e9ff), centerX, centerY + pulseSize * 0.3f,
            false));
        g.fillEllipse (centerX - pulseSize * 0.8f, centerY - pulseSize * 0.8f,
                       pulseSize * 1.6f, pulseSize * 1.6f);

        // Eyes
        drawEyes (g, centerX, centerY, pulseSize);

        // Floating particles
        drawParticles (g, bounds);
    }

    void resized() override
    {
    }

    /**
     * @brief Trigger morph animation when prompt changes
     */
    void triggerMorph()
    {
        morphIntensity = 1.0f;
        repaint();
    }

    /**
     * @brief Update based on audio level
     */
    void setAudioLevel (float level)
    {
        audioLevel = juce::jlimit (0.0f, 1.0f, level);
    }

private:
    struct Particle
    {
        float x = 0, y = 0;
        float size = 2.0f;
        float speed = 1.0f;
        float alpha = 0.5f;
    };

    void timerCallback() override
    {
        // Smooth pulsing animation
        pulsePhase += 0.05f;
        pulseAmount = std::sin (pulsePhase) * 0.5f + 0.5f;

        // Tentacle animation
        tentaclePhase += 0.03f;

        // Morph decay
        if (morphIntensity > 0.0f)
            morphIntensity *= 0.95f;

        // Particle animation
        for (auto& particle : particles)
        {
            particle.y -= particle.speed;
            particle.alpha *= 0.98f;

            if (particle.y < 0 || particle.alpha < 0.01f)
            {
                resetParticle (particle);
            }
        }

        repaint();
    }

    void drawTentacles (juce::Graphics& g, float cx, float cy, float size)
    {
        int numTentacles = 8;
        float baseRadius = size * 0.25f;
        float tentacleLength = size * 0.4f;

        for (int i = 0; i < numTentacles; ++i)
        {
            float angle = (i / (float) numTentacles) * juce::MathConstants<float>::twoPi;
            float waveOffset = std::sin (tentaclePhase + i * 0.5f) * 20.0f;

            juce::Path tentacle;
            float startX = cx + std::cos (angle) * baseRadius;
            float startY = cy + std::sin (angle) * baseRadius;

            tentacle.startNewSubPath (startX, startY);

            // Curvy tentacle
            for (int j = 1; j <= 5; ++j)
            {
                float progress = j / 5.0f;
                float currentLength = baseRadius + tentacleLength * progress;
                float wave = std::sin (tentaclePhase + i * 0.5f + progress * 3.0f) * waveOffset * progress;

                float x = cx + std::cos (angle) * currentLength + std::cos (angle + juce::MathConstants<float>::halfPi) * wave;
                float y = cy + std::sin (angle) * currentLength + std::sin (angle + juce::MathConstants<float>::halfPi) * wave;

                tentacle.lineTo (x, y);
            }

            // Gradient stroke
            juce::ColourGradient gradient (
                juce::Colour (0x809f7bff), startX, startY,
                juce::Colour (0x0052e9ff), cx + std::cos (angle) * (baseRadius + tentacleLength), cy + std::sin (angle) * (baseRadius + tentacleLength),
                false);

            g.setGradientFill (gradient);
            g.strokePath (tentacle, juce::PathStrokeType (3.0f, juce::PathStrokeType::curved));
        }
    }

    void drawEyes (juce::Graphics& g, float cx, float cy, float size)
    {
        float eyeY = cy - size * 0.2f;
        float eyeSpacing = size * 0.3f;
        float eyeSize = size * 0.15f;

        // Left eye
        g.setColour (juce::Colour (0xffffffff));
        g.fillEllipse (cx - eyeSpacing - eyeSize, eyeY - eyeSize, eyeSize * 2, eyeSize * 2);
        g.setColour (juce::Colour (0xff9f7bff));
        g.fillEllipse (cx - eyeSpacing - eyeSize * 0.5f, eyeY - eyeSize * 0.5f, eyeSize, eyeSize);

        // Right eye
        g.setColour (juce::Colour (0xffffffff));
        g.fillEllipse (cx + eyeSpacing - eyeSize, eyeY - eyeSize, eyeSize * 2, eyeSize * 2);
        g.setColour (juce::Colour (0xff9f7bff));
        g.fillEllipse (cx + eyeSpacing - eyeSize * 0.5f, eyeY - eyeSize * 0.5f, eyeSize, eyeSize);
    }

    void drawParticles (juce::Graphics& g, juce::Rectangle<float> bounds)
    {
        for (const auto& particle : particles)
        {
            g.setColour (juce::Colour (0xff52e9ff).withAlpha (particle.alpha));
            g.fillEllipse (particle.x - particle.size, particle.y - particle.size,
                           particle.size * 2, particle.size * 2);
        }
    }

    void resetParticle (Particle& p)
    {
        auto bounds = getLocalBounds().toFloat();
        p.x = bounds.getCentreX() + (juce::Random::getSystemRandom().nextFloat() - 0.5f) * bounds.getWidth() * 0.3f;
        p.y = bounds.getBottom();
        p.size = juce::Random::getSystemRandom().nextFloat() * 3.0f + 1.0f;
        p.speed = juce::Random::getSystemRandom().nextFloat() * 2.0f + 0.5f;
        p.alpha = juce::Random::getSystemRandom().nextFloat() * 0.6f + 0.2f;
    }

    float pulsePhase = 0.0f;
    float pulseAmount = 0.0f;
    float tentaclePhase = 0.0f;
    float morphIntensity = 0.0f;
    float audioLevel = 0.0f;

    std::array<Particle, 20> particles;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (MascotComponent)
};

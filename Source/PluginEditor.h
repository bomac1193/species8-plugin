/*
  ==============================================================================
    PluginEditor.h
    Part of Species 8 - Sound Design Plugin

    Minimal, sleek, glassmorphic UI with The Mutant mascot
  ==============================================================================
*/

#pragma once

#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_gui_basics/juce_gui_basics.h>
#include "PluginProcessor.h"
#include "MascotComponent.h"
#include "GlassmorphicLookAndFeel.h"

//==============================================================================
/**
 * @brief Redesigned minimal glassmorphic editor for Species 8
 *
 * Features:
 * - The Mutant animated mascot as centerpiece
 * - Glassmorphic prompt input
 * - Minimal, sleek controls
 * - Smooth animations
 */
class Species8AudioProcessorEditor : public juce::AudioProcessorEditor,
                                      private juce::Timer
{
public:
    explicit Species8AudioProcessorEditor (Species8AudioProcessor&);
    ~Species8AudioProcessorEditor() override;

    //==============================================================================
    void paint (juce::Graphics&) override;
    void resized() override;

private:
    void timerCallback() override;

    // Reference to processor
    Species8AudioProcessor& audioProcessor;

    // Custom look and feel
    GlassmorphicLookAndFeel glassmorphicLookAndFeel;

    // GUI components
    MascotComponent mascot;

    juce::Label titleLabel;

    // Glassmorphic prompt panel
    juce::Component promptPanel;
    juce::TextEditor promptTextEditor;
    juce::TextButton mutateButton;

    // Minimal controls
    juce::Slider dryWetSlider;
    juce::Slider gainSlider;
    juce::ToggleButton bypassButton;

    juce::Label dryWetLabel;
    juce::Label gainLabel;

    // Parameter attachments
    std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment> dryWetAttachment;
    std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment> gainAttachment;
    std::unique_ptr<juce::AudioProcessorValueTreeState::ButtonAttachment> bypassAttachment;

    // Animation
    float mutateGlowIntensity = 0.0f;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (Species8AudioProcessorEditor)
};

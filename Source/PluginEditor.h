/*
  ==============================================================================
    PluginEditor.h
    Part of Species 8 - Sound Design Plugin

    Main GUI editor for the plugin
  ==============================================================================
*/

#pragma once

#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_gui_basics/juce_gui_basics.h>
#include "PluginProcessor.h"
#include "DragDropComponent.h"

//==============================================================================
/**
 * @brief Main editor GUI for Species 8 plugin
 *
 * Features:
 * - Drag & drop audio file loading with waveform display
 * - Text prompt input field
 * - Mutate button for applying prompt
 * - Parameter controls (dry/wet, gain, bypass)
 */
class Species8AudioProcessorEditor : public juce::AudioProcessorEditor
{
public:
    explicit Species8AudioProcessorEditor (Species8AudioProcessor&);
    ~Species8AudioProcessorEditor() override;

    //==============================================================================
    void paint (juce::Graphics&) override;
    void resized() override;

private:
    // Custom styling helper
    void styleSlider (juce::Slider& slider);
    void styleButton (juce::TextButton& button);
    void styleLabel (juce::Label& label);

    // Reference to processor
    Species8AudioProcessor& audioProcessor;

    // GUI components
    DragDropComponent dragDropComponent;

    juce::Label titleLabel;
    juce::Label subtitleLabel;

    juce::Label promptLabel;
    juce::TextEditor promptTextEditor;
    juce::TextButton mutateButton;

    juce::Label dryWetLabel;
    juce::Slider dryWetSlider;

    juce::Label gainLabel;
    juce::Slider gainSlider;

    juce::ToggleButton bypassButton;

    // Parameter attachments
    std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment> dryWetAttachment;
    std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment> gainAttachment;
    std::unique_ptr<juce::AudioProcessorValueTreeState::ButtonAttachment> bypassAttachment;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (Species8AudioProcessorEditor)
};

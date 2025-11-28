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
#include <array>
#include "PluginProcessor.h"
#include "GlassmorphicLookAndFeel.h"
#include "DragDropComponent.h"

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
    juce::Label titleLabel;
    juce::Label subtitleLabel;
    juce::Label aiBadgeLabel;
    juce::Label promptTitleLabel;
    juce::Label promptSubtitleLabel;

    // Glassmorphic prompt panel
    juce::Component promptPanel;
    juce::TextEditor promptTextEditor;
    juce::TextButton mutateButton;
    juce::OwnedArray<juce::TextButton> promptSuggestionButtons;
    juce::OwnedArray<juce::TextButton> promptToolbarButtons;

    // Hero drag & drop section
    DragDropComponent dragDropComponent;
    juce::Label heroTitleLabel;
    juce::Label heroSubtitleLabel;
    juce::TextButton uploadButton;
    juce::Rectangle<int> heroPanelBounds;

    // Mutation sliders
    juce::Label sliderHeading;
    juce::Slider dryWetSlider;
    juce::Slider gainSlider;
    juce::Slider orbitSlider;
    juce::ToggleButton bypassButton;

    juce::Label dryWetLabel;
    juce::Label gainLabel;
    juce::Label orbitLabel;

    // Parameter attachments
    std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment> dryWetAttachment;
    std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment> gainAttachment;
    std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment> orbitAttachment;
    std::unique_ptr<juce::AudioProcessorValueTreeState::ButtonAttachment> bypassAttachment;
    std::unique_ptr<juce::FileChooser> fileChooser;

    // Animation
    float mutateGlowIntensity = 0.0f;
    float backgroundPhase = 0.0f;
    juce::Image backgroundCache;
    bool backgroundDirty = true;

    void paintBackground (juce::Graphics& g);
    void updateBackgroundCache();
    void paintPromptPanel (juce::Graphics& g);
    void paintHeroPanel (juce::Graphics& g);
    void createPromptSuggestions();
    void createPromptToolbar();
    void handleSuggestionClicked (const juce::String& text);
    void handleToolbarClicked (const juce::String& text);
    void handleFileBrowse();

    static constexpr std::array<const char*, 3> defaultSuggestions
    {
        "wider 8d orbit, crisp highs",
        "plastic space, futuristic shimmer",
        "darker intimate, mono focus"
    };

    struct ToolbarPreset
    {
        const char* label;
        const char* tooltip;
        const char* phrase;
    };

    static constexpr std::array<ToolbarPreset, 6> toolbarPresets
    {{
        { "AI", "Suggest futuristic tone", "synthetic neon aura" },
        { "B", "Add body and clarity", "bold low-mid clarity" },
        { "I", "Add shimmer & sparkle", "iridescent highs" },
        { "8D", "More motion", "binaural orbit sweep" },
        { "FX", "Experimental texture", "granular stardust texture" },
        { "∞", "Ethereal sustain", "infinite tail and bloom" }
    }};

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (Species8AudioProcessorEditor)
};

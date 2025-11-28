/*
  ==============================================================================
    PluginEditor.cpp
    Part of Species 8 - Sound Design Plugin

    Minimal, sleek, glassmorphic UI implementation
  ==============================================================================
*/

#include "PluginProcessor.h"
#include "PluginEditor.h"

//==============================================================================
Species8AudioProcessorEditor::Species8AudioProcessorEditor (Species8AudioProcessor& p)
    : AudioProcessorEditor (&p),
      audioProcessor (p)
{
    // Set custom look and feel
    setLookAndFeel (&glassmorphicLookAndFeel);

    // Set editor size - taller for mascot
    setSize (700, 600);

    // Title
    titleLabel.setText ("SPECIES 8", juce::dontSendNotification);
    titleLabel.setFont (juce::Font (juce::FontOptions (48.0f, juce::Font::bold)).withExtraKerningFactor (0.1f));
    titleLabel.setColour (juce::Label::textColourId, juce::Colours::white);
    titleLabel.setJustificationType (juce::Justification::centred);
    addAndMakeVisible (titleLabel);

    // Mascot (centerpiece!)
    addAndMakeVisible (mascot);

    // Glassmorphic prompt panel (invisible, just for painting)
    addAndMakeVisible (promptPanel);

    // Prompt text editor
    promptTextEditor.setMultiLine (false);
    promptTextEditor.setReturnKeyStartsNewLine (false);
    promptTextEditor.setText ("wider, less muddy, plastic space");
    promptTextEditor.setFont (juce::Font (juce::FontOptions (16.0f)));
    promptTextEditor.setColour (juce::TextEditor::backgroundColourId, juce::Colour (0x20ffffff));
    promptTextEditor.setColour (juce::TextEditor::textColourId, juce::Colours::white);
    promptTextEditor.setColour (juce::TextEditor::outlineColourId, juce::Colour (0x409f7bff));
    promptTextEditor.setColour (juce::TextEditor::focusedOutlineColourId, juce::Colour (0x809f7bff));
    promptTextEditor.setJustification (juce::Justification::centred);
    addAndMakeVisible (promptTextEditor);

    // Mutate button
    mutateButton.setButtonText ("MUTATE");
    mutateButton.onClick = [this]
    {
        auto promptText = promptTextEditor.getText();
        audioProcessor.updateParametersFromPrompt (promptText);
        mascot.triggerMorph();
        mutateGlowIntensity = 1.0f;
    };
    addAndMakeVisible (mutateButton);

    // Dry/Wet slider
    dryWetSlider.setSliderStyle (juce::Slider::RotaryHorizontalVerticalDrag);
    dryWetSlider.setTextBoxStyle (juce::Slider::TextBoxBelow, false, 70, 20);
    dryWetSlider.setTextValueSuffix ("%");
    addAndMakeVisible (dryWetSlider);

    dryWetLabel.setText ("Mix", juce::dontSendNotification);
    dryWetLabel.setFont (juce::Font (juce::FontOptions (12.0f, juce::Font::bold)));
    dryWetLabel.setColour (juce::Label::textColourId, juce::Colour (0xffaaaaaa));
    dryWetLabel.setJustificationType (juce::Justification::centred);
    addAndMakeVisible (dryWetLabel);

    // Gain slider
    gainSlider.setSliderStyle (juce::Slider::RotaryHorizontalVerticalDrag);
    gainSlider.setTextBoxStyle (juce::Slider::TextBoxBelow, false, 70, 20);
    gainSlider.setTextValueSuffix (" dB");
    addAndMakeVisible (gainSlider);

    gainLabel.setText ("Output", juce::dontSendNotification);
    gainLabel.setFont (juce::Font (juce::FontOptions (12.0f, juce::Font::bold)));
    gainLabel.setColour (juce::Label::textColourId, juce::Colour (0xffaaaaaa));
    gainLabel.setJustificationType (juce::Justification::centred);
    addAndMakeVisible (gainLabel);

    // Bypass button
    bypassButton.setButtonText ("Bypass");
    bypassButton.setColour (juce::ToggleButton::textColourId, juce::Colours::white);
    bypassButton.setColour (juce::ToggleButton::tickColourId, juce::Colour (0xff9f7bff));
    addAndMakeVisible (bypassButton);

    // Attach parameters
    dryWetAttachment = std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment> (
        audioProcessor.getValueTreeState(), "dryWet", dryWetSlider);
    gainAttachment = std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment> (
        audioProcessor.getValueTreeState(), "outputGain", gainSlider);
    bypassAttachment = std::make_unique<juce::AudioProcessorValueTreeState::ButtonAttachment> (
        audioProcessor.getValueTreeState(), "bypass", bypassButton);

    // Start animation timer
    startTimerHz (30);
}

Species8AudioProcessorEditor::~Species8AudioProcessorEditor()
{
    stopTimer();
    setLookAndFeel (nullptr);
}

//==============================================================================
void Species8AudioProcessorEditor::paint (juce::Graphics& g)
{
    // Deep space gradient background
    juce::ColourGradient bgGradient (
        juce::Colour (0xff0a0a14), 0.0f, 0.0f,
        juce::Colour (0xff1a1a2e), 0.0f, static_cast<float> (getHeight()),
        false);
    g.setGradientFill (bgGradient);
    g.fillAll();

    // Cosmic glow orbs
    g.setColour (juce::Colour (0x159f7bff));
    g.fillEllipse (getWidth() * 0.2f, getHeight() * 0.1f, 300, 300);
    g.setColour (juce::Colour (0x1552e9ff));
    g.fillEllipse (getWidth() * 0.7f, getHeight() * 0.6f, 250, 250);

    // Glassmorphic prompt panel
    auto promptBounds = promptPanel.getBounds().toFloat();

    // Glow
    g.setColour (juce::Colour (0x309f7bff).withAlpha (mutateGlowIntensity * 0.5f));
    g.fillRoundedRectangle (promptBounds.expanded (4), 24.0f);

    // Glass panel
    g.setGradientFill (juce::ColourGradient (
        juce::Colour (0x30ffffff), promptBounds.getX(), promptBounds.getY(),
        juce::Colour (0x10ffffff), promptBounds.getX(), promptBounds.getBottom(),
        false));
    g.fillRoundedRectangle (promptBounds, 24.0f);

    // Border
    g.setColour (juce::Colour (0x60ffffff));
    g.drawRoundedRectangle (promptBounds, 24.0f, 2.0f);

    // Subtitle text below mascot
    g.setColour (juce::Colour (0x80ffffff));
    g.setFont (juce::Font (juce::FontOptions (11.0f, juce::Font::italic)));
    auto subtitleArea = juce::Rectangle<float> (0, mascot.getBottom() + 5, getWidth(), 20);
    g.drawText ("Break the norm. Birth the impossible.", subtitleArea, juce::Justification::centred);
}

void Species8AudioProcessorEditor::resized()
{
    auto bounds = getLocalBounds().reduced (20);

    // Title at top
    titleLabel.setBounds (bounds.removeFromTop (60));

    // Mascot (large centerpiece)
    auto mascotSize = 280;
    mascot.setBounds (bounds.removeFromTop (mascotSize).withSizeKeepingCentre (mascotSize, mascotSize));

    bounds.removeFromTop (30); // Spacing

    // Glassmorphic prompt panel
    auto promptAreaHeight = 120;
    auto promptArea = bounds.removeFromTop (promptAreaHeight);
    promptPanel.setBounds (promptArea);

    // Prompt input and button inside panel
    auto innerPrompt = promptArea.reduced (20);

    // Mutate button on right
    auto buttonWidth = 120;
    mutateButton.setBounds (innerPrompt.removeFromBottom (50).removeFromRight (buttonWidth));

    // Text input fills remaining space
    innerPrompt.removeFromBottom (10); // spacing
    promptTextEditor.setBounds (innerPrompt.removeFromBottom (40));

    bounds.removeFromTop (30); // Spacing

    // Controls at bottom (minimal, small)
    auto controlsArea = bounds.removeFromTop (100);
    auto knobSize = 80;
    auto spacing = 30;

    auto totalWidth = knobSize * 2 + spacing;
    auto controlX = (controlsArea.getWidth() - totalWidth) / 2;

    // Mix knob
    auto mixArea = controlsArea.removeFromLeft (controlX).withWidth (knobSize);
    dryWetLabel.setBounds (mixArea.removeFromTop (15));
    dryWetSlider.setBounds (mixArea);

    controlsArea.removeFromLeft (spacing);

    // Output knob
    auto outputArea = controlsArea.removeFromLeft (knobSize);
    gainLabel.setBounds (outputArea.removeFromTop (15));
    gainSlider.setBounds (outputArea);

    // Bypass in center bottom
    auto bypassArea = bounds.withHeight (30);
    bypassButton.setBounds (bypassArea.withSizeKeepingCentre (100, 25));
}

void Species8AudioProcessorEditor::timerCallback()
{
    // Decay mutate glow
    if (mutateGlowIntensity > 0.0f)
    {
        mutateGlowIntensity *= 0.95f;
        repaint();
    }
}

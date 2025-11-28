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

    // Set editor size - spacious modern layout
    setSize (850, 750);

    // Title - modern minimal typography
    titleLabel.setText ("SPECIES 8", juce::dontSendNotification);
    titleLabel.setFont (juce::Font (juce::FontOptions (64.0f, juce::Font::plain)).withExtraKerningFactor (0.15f));
    titleLabel.setColour (juce::Label::textColourId, juce::Colour (0xffffffff));
    titleLabel.setJustificationType (juce::Justification::centred);
    addAndMakeVisible (titleLabel);

    // Mascot (centerpiece!)
    addAndMakeVisible (mascot);

    // Glassmorphic prompt panel (invisible, just for painting)
    addAndMakeVisible (promptPanel);

    // Prompt text editor - clean modern input
    promptTextEditor.setMultiLine (false);
    promptTextEditor.setReturnKeyStartsNewLine (false);
    promptTextEditor.setText ("wider, less muddy, plastic space");
    promptTextEditor.setFont (juce::Font (juce::FontOptions (18.0f, juce::Font::plain)));
    promptTextEditor.setColour (juce::TextEditor::backgroundColourId, juce::Colour (0x15ffffff));
    promptTextEditor.setColour (juce::TextEditor::textColourId, juce::Colour (0xfff0f0f0));
    promptTextEditor.setColour (juce::TextEditor::outlineColourId, juce::Colour (0x00000000));
    promptTextEditor.setColour (juce::TextEditor::focusedOutlineColourId, juce::Colour (0x00000000));
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

    dryWetLabel.setText ("MIX", juce::dontSendNotification);
    dryWetLabel.setFont (juce::Font (juce::FontOptions (10.0f, juce::Font::plain)).withExtraKerningFactor (0.12f));
    dryWetLabel.setColour (juce::Label::textColourId, juce::Colour (0xffb0b0b0));
    dryWetLabel.setJustificationType (juce::Justification::centred);
    addAndMakeVisible (dryWetLabel);

    // Gain slider
    gainSlider.setSliderStyle (juce::Slider::RotaryHorizontalVerticalDrag);
    gainSlider.setTextBoxStyle (juce::Slider::TextBoxBelow, false, 70, 20);
    gainSlider.setTextValueSuffix (" dB");
    addAndMakeVisible (gainSlider);

    gainLabel.setText ("OUTPUT", juce::dontSendNotification);
    gainLabel.setFont (juce::Font (juce::FontOptions (10.0f, juce::Font::plain)).withExtraKerningFactor (0.12f));
    gainLabel.setColour (juce::Label::textColourId, juce::Colour (0xffb0b0b0));
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
    // Modern minimal gradient background
    juce::ColourGradient bgGradient (
        juce::Colour (0xff0d0d18), 0.0f, 0.0f,
        juce::Colour (0xff1a1a28), 0.0f, static_cast<float> (getHeight()),
        false);
    g.setGradientFill (bgGradient);
    g.fillAll();

    // Subtle ambient glow orbs - more refined
    g.setColour (juce::Colour (0x0a9f7bff));
    g.fillEllipse (getWidth() * 0.15f, getHeight() * 0.08f, 350, 350);
    g.setColour (juce::Colour (0x0a52e9ff));
    g.fillEllipse (getWidth() * 0.72f, getHeight() * 0.62f, 280, 280);

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

    // Subtitle text below mascot - minimal modern typography
    g.setColour (juce::Colour (0x60ffffff));
    g.setFont (juce::Font (juce::FontOptions (12.0f, juce::Font::plain)).withExtraKerningFactor (0.08f));
    auto subtitleArea = juce::Rectangle<float> (0, mascot.getBottom() + 10, getWidth(), 25);
    g.drawText ("AI-Inspired Sound Design", subtitleArea, juce::Justification::centred);
}

void Species8AudioProcessorEditor::resized()
{
    auto bounds = getLocalBounds().reduced (40); // More generous margins

    // Title at top - more breathing room
    bounds.removeFromTop (20); // Top padding
    titleLabel.setBounds (bounds.removeFromTop (80));

    bounds.removeFromTop (15); // Spacing

    // Mascot (large centerpiece)
    auto mascotSize = 300; // Slightly larger
    mascot.setBounds (bounds.removeFromTop (mascotSize).withSizeKeepingCentre (mascotSize, mascotSize));

    bounds.removeFromTop (50); // More generous spacing

    // Glassmorphic prompt panel
    auto promptAreaHeight = 140; // Taller panel
    auto promptArea = bounds.removeFromTop (promptAreaHeight);
    promptPanel.setBounds (promptArea);

    // Prompt input and button inside panel
    auto innerPrompt = promptArea.reduced (30); // More padding

    // Mutate button on right
    auto buttonWidth = 130;
    mutateButton.setBounds (innerPrompt.removeFromBottom (55).removeFromRight (buttonWidth));

    // Text input fills remaining space
    innerPrompt.removeFromBottom (15); // More spacing
    promptTextEditor.setBounds (innerPrompt.removeFromBottom (48)); // Taller input

    bounds.removeFromTop (40); // More spacing before controls

    // Controls at bottom - more spacious
    auto controlsArea = bounds.removeFromTop (110);
    auto knobSize = 90; // Larger knobs
    auto spacing = 60; // More spacing between knobs

    auto totalWidth = knobSize * 2 + spacing;
    auto controlX = (controlsArea.getWidth() - totalWidth) / 2;

    // Mix knob
    auto mixArea = controlsArea.removeFromLeft (controlX).withWidth (knobSize);
    dryWetLabel.setBounds (mixArea.removeFromTop (20)); // More space for label
    dryWetSlider.setBounds (mixArea);

    controlsArea.removeFromLeft (spacing);

    // Output knob
    auto outputArea = controlsArea.removeFromLeft (knobSize);
    gainLabel.setBounds (outputArea.removeFromTop (20)); // More space for label
    gainSlider.setBounds (outputArea);

    // Bypass in center bottom
    auto bypassArea = bounds.withHeight (35);
    bypassButton.setBounds (bypassArea.withSizeKeepingCentre (110, 28));
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

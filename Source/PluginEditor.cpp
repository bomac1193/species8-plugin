/*
  ==============================================================================
    PluginEditor.cpp
    Part of Species 8 - Sound Design Plugin
  ==============================================================================
*/

#include "PluginProcessor.h"
#include "PluginEditor.h"

//==============================================================================
Species8AudioProcessorEditor::Species8AudioProcessorEditor (Species8AudioProcessor& p)
    : AudioProcessorEditor (&p),
      audioProcessor (p),
      dragDropComponent (p)
{
    // Set editor size
    setSize (900, 550);

    // Title
    titleLabel.setText ("SPECIES 8", juce::dontSendNotification);
    titleLabel.setFont (juce::Font (36.0f, juce::Font::bold));
    titleLabel.setColour (juce::Label::textColourId, juce::Colour (0xffd5c7ff));
    titleLabel.setJustificationType (juce::Justification::centred);
    addAndMakeVisible (titleLabel);

    // Subtitle
    subtitleLabel.setText ("Break the norm. Birth the impossible.", juce::dontSendNotification);
    subtitleLabel.setFont (juce::Font (14.0f, juce::Font::italic));
    subtitleLabel.setColour (juce::Label::textColourId, juce::Colour (0xff98a1c4));
    subtitleLabel.setJustificationType (juce::Justification::centred);
    addAndMakeVisible (subtitleLabel);

    // Drag & drop area
    addAndMakeVisible (dragDropComponent);

    // Prompt label
    promptLabel.setText ("Prompt:", juce::dontSendNotification);
    styleLabel (promptLabel);
    addAndMakeVisible (promptLabel);

    // Prompt text editor
    promptTextEditor.setMultiLine (false);
    promptTextEditor.setReturnKeyStartsNewLine (false);
    promptTextEditor.setScrollbarsShown (false);
    promptTextEditor.setCaretVisible (true);
    promptTextEditor.setPopupMenuEnabled (true);
    promptTextEditor.setText ("wider, less muddy, plastic space");
    promptTextEditor.setFont (juce::Font (14.0f));
    promptTextEditor.setColour (juce::TextEditor::backgroundColourId, juce::Colour (0xff1a1a2e));
    promptTextEditor.setColour (juce::TextEditor::textColourId, juce::Colour (0xfff4f7ff));
    promptTextEditor.setColour (juce::TextEditor::outlineColourId, juce::Colour (0xff3d3d5c));
    promptTextEditor.setColour (juce::TextEditor::focusedOutlineColourId, juce::Colour (0xff9f7bff));
    addAndMakeVisible (promptTextEditor);

    // Mutate button
    mutateButton.setButtonText ("MUTATE");
    styleButton (mutateButton);
    mutateButton.onClick = [this]
    {
        auto promptText = promptTextEditor.getText();
        audioProcessor.updateParametersFromPrompt (promptText);
    };
    addAndMakeVisible (mutateButton);

    // Dry/Wet control
    dryWetLabel.setText ("Dry/Wet", juce::dontSendNotification);
    styleLabel (dryWetLabel);
    addAndMakeVisible (dryWetLabel);

    dryWetSlider.setSliderStyle (juce::Slider::RotaryHorizontalVerticalDrag);
    dryWetSlider.setTextBoxStyle (juce::Slider::TextBoxBelow, false, 80, 20);
    styleSlider (dryWetSlider);
    addAndMakeVisible (dryWetSlider);

    dryWetAttachment = std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment> (
        audioProcessor.getValueTreeState(), "dryWet", dryWetSlider);

    // Gain control
    gainLabel.setText ("Output", juce::dontSendNotification);
    styleLabel (gainLabel);
    addAndMakeVisible (gainLabel);

    gainSlider.setSliderStyle (juce::Slider::RotaryHorizontalVerticalDrag);
    gainSlider.setTextBoxStyle (juce::Slider::TextBoxBelow, false, 80, 20);
    styleSlider (gainSlider);
    addAndMakeVisible (gainSlider);

    gainAttachment = std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment> (
        audioProcessor.getValueTreeState(), "outputGain", gainSlider);

    // Bypass button
    bypassButton.setButtonText ("Bypass");
    bypassButton.setColour (juce::ToggleButton::textColourId, juce::Colour (0xfff4f7ff));
    bypassButton.setColour (juce::ToggleButton::tickColourId, juce::Colour (0xff9f7bff));
    bypassButton.setColour (juce::ToggleButton::tickDisabledColourId, juce::Colour (0xff3d3d5c));
    addAndMakeVisible (bypassButton);

    bypassAttachment = std::make_unique<juce::AudioProcessorValueTreeState::ButtonAttachment> (
        audioProcessor.getValueTreeState(), "bypass", bypassButton);
}

Species8AudioProcessorEditor::~Species8AudioProcessorEditor()
{
}

//==============================================================================
void Species8AudioProcessorEditor::paint (juce::Graphics& g)
{
    // Background gradient
    juce::ColourGradient gradient (
        juce::Colour (0xff0b1223), 0.0f, 0.0f,
        juce::Colour (0xff03030b), 0.0f, static_cast<float> (getHeight()),
        false);
    g.setGradientFill (gradient);
    g.fillAll();

    // Subtle glow effect
    g.setColour (juce::Colour (0xff9f7bff).withAlpha (0.05f));
    g.fillEllipse (getWidth() * 0.5f - 200, -100, 400, 400);
}

void Species8AudioProcessorEditor::resized()
{
    auto bounds = getLocalBounds().reduced (20);

    // Title area
    auto titleArea = bounds.removeFromTop (70);
    titleLabel.setBounds (titleArea.removeFromTop (40));
    subtitleLabel.setBounds (titleArea);

    bounds.removeFromTop (10);

    // Drag & drop area (waveform)
    auto waveformArea = bounds.removeFromTop (150);
    dragDropComponent.setBounds (waveformArea);

    bounds.removeFromTop (20);

    // Prompt area
    auto promptArea = bounds.removeFromTop (80);
    auto promptLabelArea = promptArea.removeFromTop (25);
    promptLabel.setBounds (promptLabelArea);

    auto promptInputArea = promptArea.removeFromTop (40);
    auto mutateButtonWidth = 120;
    mutateButton.setBounds (promptInputArea.removeFromRight (mutateButtonWidth));
    promptInputArea.removeFromRight (10); // spacing
    promptTextEditor.setBounds (promptInputArea);

    bounds.removeFromTop (30);

    // Controls area
    auto controlsArea = bounds.removeFromTop (120);

    // Divide into three columns for knobs
    auto knobWidth = controlsArea.getWidth() / 3;

    // Dry/Wet knob
    auto dryWetArea = controlsArea.removeFromLeft (knobWidth);
    dryWetLabel.setBounds (dryWetArea.removeFromTop (25));
    dryWetSlider.setBounds (dryWetArea.reduced (20, 0));

    // Gain knob
    auto gainArea = controlsArea.removeFromLeft (knobWidth);
    gainLabel.setBounds (gainArea.removeFromTop (25));
    gainSlider.setBounds (gainArea.reduced (20, 0));

    // Bypass in third column
    auto bypassArea = controlsArea.removeFromLeft (knobWidth);
    bypassButton.setBounds (bypassArea.withSizeKeepingCentre (100, 30));
}

//==============================================================================
void Species8AudioProcessorEditor::styleSlider (juce::Slider& slider)
{
    slider.setColour (juce::Slider::thumbColourId, juce::Colour (0xff9f7bff));
    slider.setColour (juce::Slider::rotarySliderFillColourId, juce::Colour (0xff9f7bff));
    slider.setColour (juce::Slider::rotarySliderOutlineColourId, juce::Colour (0xff3d3d5c));
    slider.setColour (juce::Slider::textBoxTextColourId, juce::Colour (0xfff4f7ff));
    slider.setColour (juce::Slider::textBoxBackgroundColourId, juce::Colour (0xff1a1a2e));
    slider.setColour (juce::Slider::textBoxOutlineColourId, juce::Colour (0xff3d3d5c));
}

void Species8AudioProcessorEditor::styleButton (juce::TextButton& button)
{
    button.setColour (juce::TextButton::buttonColourId, juce::Colour (0xff9f7bff));
    button.setColour (juce::TextButton::buttonOnColourId, juce::Colour (0xffd5c7ff));
    button.setColour (juce::TextButton::textColourOffId, juce::Colour (0xff05040b));
    button.setColour (juce::TextButton::textColourOnId, juce::Colour (0xff05040b));
}

void Species8AudioProcessorEditor::styleLabel (juce::Label& label)
{
    label.setFont (juce::Font (14.0f, juce::Font::bold));
    label.setColour (juce::Label::textColourId, juce::Colour (0xff98a1c4));
    label.setJustificationType (juce::Justification::centredLeft);
}

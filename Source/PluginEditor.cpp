/*
  ==============================================================================
    PluginEditor.cpp
    Part of Species 8 - Sound Design Plugin

    Futuristic UI composed of a glassmorphic AI prompt on the left and a shader-
    inspired drag & drop hero with motion sliders on the right.
  ==============================================================================
*/

#include "PluginProcessor.h"
#include "PluginEditor.h"

namespace
{
void configureMutationSlider (juce::Slider& slider)
{
    slider.setSliderStyle (juce::Slider::LinearHorizontal);
    slider.setTextBoxStyle (juce::Slider::TextBoxRight, false, 60, 20);
    slider.setColour (juce::Slider::trackColourId, juce::Colour (0xff6e5bff));
    slider.setColour (juce::Slider::thumbColourId, juce::Colour (0xfffdfdfd));
    slider.setColour (juce::Slider::backgroundColourId, juce::Colour (0x20ffffff));
    slider.setColour (juce::Slider::textBoxOutlineColourId, juce::Colours::transparentBlack);
}
} // namespace

//==============================================================================
Species8AudioProcessorEditor::Species8AudioProcessorEditor (Species8AudioProcessor& p)
    : AudioProcessorEditor (&p),
      audioProcessor (p),
      dragDropComponent (p)
{
    setLookAndFeel (&glassmorphicLookAndFeel);
    setSize (980, 760);

    // Title + subtitle --------------------------------------------------------
    titleLabel.setText ("SPECIES 8", juce::dontSendNotification);
    titleLabel.setFont (juce::Font (juce::FontOptions (66.0f, juce::Font::bold)).withExtraKerningFactor (0.1f));
    titleLabel.setColour (juce::Label::textColourId, juce::Colour (0xfff5f4ff));
    titleLabel.setJustificationType (juce::Justification::centred);
    addAndMakeVisible (titleLabel);

    subtitleLabel.setText ("Glassmorphic Mutation Lab", juce::dontSendNotification);
    subtitleLabel.setFont (juce::Font (juce::FontOptions (16.0f, juce::Font::plain)));
    subtitleLabel.setColour (juce::Label::textColourId, juce::Colour (0x99d6d6ff));
    subtitleLabel.setJustificationType (juce::Justification::centred);
    addAndMakeVisible (subtitleLabel);

    // Prompt deck components --------------------------------------------------
    promptPanel.setInterceptsMouseClicks (false, false);
    addAndMakeVisible (promptPanel);

    aiBadgeLabel.setText ("AI PROMPT", juce::dontSendNotification);
    aiBadgeLabel.setFont (juce::Font (juce::FontOptions (12.0f, juce::Font::bold)));
    aiBadgeLabel.setColour (juce::Label::backgroundColourId, juce::Colour (0xfffe8460));
    aiBadgeLabel.setColour (juce::Label::textColourId, juce::Colour (0xff0f071b));
    aiBadgeLabel.setJustificationType (juce::Justification::centred);
    aiBadgeLabel.setBorderSize ({});
    aiBadgeLabel.setInterceptsMouseClicks (false, false);
    addAndMakeVisible (aiBadgeLabel);

    promptTitleLabel.setText ("Describe the mutation", juce::dontSendNotification);
    promptTitleLabel.setColour (juce::Label::textColourId, juce::Colour (0xfff6f6ff));
    promptTitleLabel.setFont (juce::Font (juce::FontOptions (22.0f, juce::Font::plain)));
    promptTitleLabel.setInterceptsMouseClicks (false, false);
    addAndMakeVisible (promptTitleLabel);

    promptSubtitleLabel.setText ("Speak freely. We’ll map your words to sound.", juce::dontSendNotification);
    promptSubtitleLabel.setColour (juce::Label::textColourId, juce::Colour (0x99f6f6ff));
    promptSubtitleLabel.setFont (juce::Font (juce::FontOptions (13.0f, juce::Font::plain)));
    promptSubtitleLabel.setInterceptsMouseClicks (false, false);
    addAndMakeVisible (promptSubtitleLabel);

    promptTextEditor.setMultiLine (true, true);
    promptTextEditor.setReturnKeyStartsNewLine (false);
    promptTextEditor.setScrollbarsShown (false);
    promptTextEditor.setFont (juce::Font (juce::FontOptions (18.0f, juce::Font::plain)));
    promptTextEditor.setColour (juce::TextEditor::backgroundColourId, juce::Colour (0x15000000));
    promptTextEditor.setColour (juce::TextEditor::textColourId, juce::Colour (0xfff7f7ff));
    promptTextEditor.setColour (juce::TextEditor::outlineColourId, juce::Colours::transparentBlack);
    promptTextEditor.setColour (juce::TextEditor::focusedOutlineColourId, juce::Colours::transparentBlack);
    promptTextEditor.setTextToShowWhenEmpty ("“wider 8d orbit, plastic shimmer, cinematic space”", juce::Colour (0x55f7f7ff));
    promptTextEditor.setJustification (juce::Justification::topLeft);
    promptTextEditor.onReturnKey = [this] { mutateButton.triggerClick(); };
    addAndMakeVisible (promptTextEditor);

    mutateButton.setButtonText ("MUTATE");
    mutateButton.setColour (juce::TextButton::buttonColourId, juce::Colour (0xff8c5bff));
    mutateButton.setColour (juce::TextButton::buttonOnColourId, juce::Colour (0xff7f3bff));
    mutateButton.setColour (juce::ComboBox::outlineColourId, juce::Colours::transparentBlack);
    mutateButton.setMouseCursor (juce::MouseCursor::PointingHandCursor);
    mutateButton.onClick = [this]
    {
        audioProcessor.updateParametersFromPrompt (promptTextEditor.getText());
        mutateGlowIntensity = 1.0f;
    };
    addAndMakeVisible (mutateButton);

    // Hero drag & drop --------------------------------------------------------
    addAndMakeVisible (dragDropComponent);

    heroTitleLabel.setText ("Drag audio to mutate it in 8D", juce::dontSendNotification);
    heroTitleLabel.setFont (juce::Font (juce::FontOptions (24.0f, juce::Font::bold)));
    heroTitleLabel.setColour (juce::Label::textColourId, juce::Colour (0xfff7f7ff));
    heroTitleLabel.setInterceptsMouseClicks (false, false);
    addAndMakeVisible (heroTitleLabel);

    heroSubtitleLabel.setText ("Drop stems or click upload to visualize the waveform and mutate it with shader energy.", juce::dontSendNotification);
    heroSubtitleLabel.setColour (juce::Label::textColourId, juce::Colour (0x99fdfdff));
    heroSubtitleLabel.setFont (juce::Font (juce::FontOptions (14.0f, juce::Font::plain)));
    heroSubtitleLabel.setInterceptsMouseClicks (false, false);
    heroSubtitleLabel.setJustificationType (juce::Justification::topLeft);
    addAndMakeVisible (heroSubtitleLabel);

    uploadButton.setButtonText ("Upload audio");
    uploadButton.setColour (juce::TextButton::buttonColourId, juce::Colour (0x28ffffff));
    uploadButton.setColour (juce::TextButton::buttonOnColourId, juce::Colour (0x40ffffff));
    uploadButton.onClick = [this] { handleFileBrowse(); };
    uploadButton.setMouseCursor (juce::MouseCursor::PointingHandCursor);
    addAndMakeVisible (uploadButton);

    // Mutation sliders --------------------------------------------------------
    sliderHeading.setText ("Mutation controls", juce::dontSendNotification);
    sliderHeading.setColour (juce::Label::textColourId, juce::Colour (0xfff7f7ff));
    sliderHeading.setFont (juce::Font (juce::FontOptions (16.0f, juce::Font::bold)));
    addAndMakeVisible (sliderHeading);

    configureMutationSlider (dryWetSlider);
    configureMutationSlider (gainSlider);
    configureMutationSlider (orbitSlider);

    dryWetSlider.setTextValueSuffix ("%");
    gainSlider.setTextValueSuffix (" dB");
    orbitSlider.setTextValueSuffix ("%");

    dryWetLabel.setText ("Mix", juce::dontSendNotification);
    gainLabel.setText ("Output", juce::dontSendNotification);
    orbitLabel.setText ("Orbit", juce::dontSendNotification);
    for (auto* label : { &dryWetLabel, &gainLabel, &orbitLabel })
    {
        label->setColour (juce::Label::textColourId, juce::Colour (0xffdcdced));
        label->setJustificationType (juce::Justification::bottomLeft);
        addAndMakeVisible (label);
    }

    addAndMakeVisible (dryWetSlider);
    addAndMakeVisible (gainSlider);
    addAndMakeVisible (orbitSlider);

    bypassButton.setButtonText ("Bypass");
    bypassButton.setColour (juce::ToggleButton::textColourId, juce::Colour (0xfff7f7ff));
    bypassButton.setColour (juce::ToggleButton::tickColourId, juce::Colour (0xff8c5bff));
    addAndMakeVisible (bypassButton);

    // Parameter attachments ---------------------------------------------------
    dryWetAttachment = std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment> (
        audioProcessor.getValueTreeState(), "dryWet", dryWetSlider);
    gainAttachment = std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment> (
        audioProcessor.getValueTreeState(), "outputGain", gainSlider);
    orbitAttachment = std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment> (
        audioProcessor.getValueTreeState(), "spatialAmount", orbitSlider);
    bypassAttachment = std::make_unique<juce::AudioProcessorValueTreeState::ButtonAttachment> (
        audioProcessor.getValueTreeState(), "bypass", bypassButton);

    createPromptSuggestions();
    createPromptToolbar();

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
    paintBackground (g);
    paintHeroPanel (g);
    paintPromptPanel (g);
}

void Species8AudioProcessorEditor::paintBackground (juce::Graphics& g)
{
    if (backgroundDirty || backgroundCache.getWidth() != getWidth() || backgroundCache.getHeight() != getHeight())
        updateBackgroundCache();

    if (backgroundCache.isValid())
        g.drawImageAt (backgroundCache, 0, 0);
    else
        g.fillAll (juce::Colour (0xff080612));
}

void Species8AudioProcessorEditor::updateBackgroundCache()
{
    auto w = getWidth();
    auto h = getHeight();

    if (w <= 0 || h <= 0)
        return;

    backgroundCache = juce::Image (juce::Image::ARGB, w, h, true);
    juce::Graphics cacheG (backgroundCache);

    juce::ColourGradient bgGradient (
        juce::Colour (0xff04030f), 0.0f, 0.0f,
        juce::Colour (0xff120832), static_cast<float> (w), static_cast<float> (h),
        false);
    bgGradient.addColour (0.5, juce::Colour (0xff040d24));
    cacheG.setGradientFill (bgGradient);
    cacheG.fillAll();

    auto addGlassOrb = [&cacheG] (juce::Point<float> centre, float radius, juce::Colour colour)
    {
        juce::ColourGradient orb (colour.withAlpha (0.55f), centre.x, centre.y,
                                  colour.withAlpha (0.0f), centre.x, centre.y + radius,
                                  true);
        cacheG.setGradientFill (orb);
        cacheG.fillEllipse (centre.x - radius, centre.y - radius, radius * 2.0f, radius * 2.0f);
    };

    addGlassOrb ({ w * 0.2f, h * 0.15f }, 230.0f, juce::Colour (0xff4c3eff));
    addGlassOrb ({ w * 0.75f, h * 0.3f }, 260.0f, juce::Colour (0xff05c7ff));
    addGlassOrb ({ w * 0.85f, h * 0.8f }, 180.0f, juce::Colour (0xfffc5bff));

    juce::Path softWave;
    auto waveY = static_cast<float> (h) * 0.35f;
    softWave.startNewSubPath (0.0f, waveY);
    softWave.quadraticTo (w * 0.25f, waveY - 60.0f, w * 0.5f, waveY + 20.0f);
    softWave.quadraticTo (w * 0.75f, waveY + 80.0f, w, waveY - 15.0f);
    softWave.lineTo (w, static_cast<float> (h));
    softWave.lineTo (0, static_cast<float> (h));
    softWave.closeSubPath ();
    cacheG.setGradientFill (juce::ColourGradient (
        juce::Colour (0x502a1380), 0.0f, waveY,
        juce::Colour (0x50022566), static_cast<float> (w), waveY + 200.0f,
        false));
    cacheG.fillPath (softWave);

    backgroundDirty = false;
}

void Species8AudioProcessorEditor::paintPromptPanel (juce::Graphics& g)
{
    auto bounds = promptPanel.getBounds().toFloat();
    if (bounds.isEmpty())
        return;

    g.setColour (juce::Colour (0x408c5bff).withAlpha (0.2f + mutateGlowIntensity * 0.3f));
    g.fillRoundedRectangle (bounds.expanded (6.0f), 32.0f);

    juce::ColourGradient panelGrad (
        juce::Colour (0x90100a24), bounds.getX(), bounds.getY(),
        juce::Colour (0x90350648), bounds.getRight(), bounds.getBottom(),
        false);
    g.setGradientFill (panelGrad);
    g.fillRoundedRectangle (bounds, 32.0f);

    g.setColour (juce::Colour (0x60ffffff));
    g.drawRoundedRectangle (bounds, 32.0f, 1.5f);
}

void Species8AudioProcessorEditor::paintHeroPanel (juce::Graphics& g)
{
    if (heroPanelBounds.isEmpty())
        return;

    auto area = heroPanelBounds.toFloat();

    juce::ColourGradient heroGrad (
        juce::Colour (0x80200962), area.getX(), area.getY(),
        juce::Colour (0x80410365), area.getRight(), area.getBottom(),
        false);
    heroGrad.addColour (0.5, juce::Colour (0x80310575));
    g.setGradientFill (heroGrad);
    g.fillRoundedRectangle (area, 36.0f);

    g.setColour (juce::Colour (0x40ffffff));
    g.drawRoundedRectangle (area, 36.0f, 1.2f);

    auto drop = dragDropComponent.getBounds().toFloat();
    g.setColour (juce::Colour (0x28ffffff));
    g.fillRoundedRectangle (drop, 24.0f);
    g.setColour (juce::Colour (0x55ffffff));
    g.drawRoundedRectangle (drop, 24.0f, 1.0f);
}

//==============================================================================
void Species8AudioProcessorEditor::resized()
{
    auto bounds = getLocalBounds().reduced (32);

    auto header = bounds.removeFromTop (90);
    titleLabel.setBounds (header.removeFromTop (60));
    subtitleLabel.setBounds (header);

    auto sliderArea = bounds.removeFromBottom (150);
    sliderHeading.setBounds (sliderArea.removeFromTop (25));

    auto mainArea = bounds.reduced (0, 10);
    auto promptWidth = juce::roundToInt (mainArea.getWidth() * 0.44f);
    auto promptArea = mainArea.removeFromLeft (promptWidth).reduced (10);
    auto heroArea = mainArea.reduced (10);
    heroPanelBounds = heroArea;

    // Prompt layout -----------------------------------------------------------
    promptPanel.setBounds (promptArea);
    auto innerPrompt = promptArea.reduced (28);

    auto badgeArea = innerPrompt.removeFromTop (32).removeFromLeft (110);
    aiBadgeLabel.setBounds (badgeArea);

    promptTitleLabel.setBounds (innerPrompt.removeFromTop (28));
    promptSubtitleLabel.setBounds (innerPrompt.removeFromTop (22));

    innerPrompt.removeFromTop (8);

    auto editorArea = innerPrompt.removeFromTop (110);
    promptTextEditor.setBounds (editorArea);

    innerPrompt.removeFromTop (10);
    auto toolbarArea = innerPrompt.removeFromTop (42);
    if (promptToolbarButtons.size() > 0)
    {
        auto spacing = 10;
        auto iconSize = 40;
        auto width = iconSize * promptToolbarButtons.size() + spacing * (promptToolbarButtons.size() - 1);
        auto startX = toolbarArea.getCentreX() - width / 2;
        auto row = juce::Rectangle<int> (startX, toolbarArea.getCentreY() - iconSize / 2, width, iconSize);

        for (auto* btn : promptToolbarButtons)
        {
            btn->setBounds (row.removeFromLeft (iconSize));
            row.removeFromLeft (spacing);
        }
    }

    innerPrompt.removeFromTop (10);
    auto chipsArea = innerPrompt.removeFromTop (32);
    if (promptSuggestionButtons.size() > 0)
    {
        auto spacing = 12;
        auto chipWidth = juce::jmax (90, (chipsArea.getWidth() - spacing * (promptSuggestionButtons.size() - 1))
                                          / promptSuggestionButtons.size());
        auto row = chipsArea;
        for (auto* chip : promptSuggestionButtons)
        {
            chip->setBounds (row.removeFromLeft (chipWidth));
            row.removeFromLeft (spacing);
        }
    }

    innerPrompt.removeFromTop (6);
    mutateButton.setBounds (innerPrompt.removeFromBottom (52));

    // Hero layout -------------------------------------------------------------
    auto heroInner = heroArea.reduced (32);
    auto heroHeader = heroInner.removeFromTop (78);
    auto uploadWidth = 150;
    uploadButton.setBounds (heroHeader.removeFromRight (uploadWidth).withHeight (36).reduced (0, 6));
    heroTitleLabel.setBounds (heroHeader.removeFromTop (32));
    heroSubtitleLabel.setBounds (heroHeader);

    dragDropComponent.setBounds (heroInner);

    // Slider layout -----------------------------------------------------------
    auto sliderInner = sliderArea.reduced (10, 0);
    auto sliderRow = sliderInner.removeFromTop (sliderInner.getHeight() - 40);
    auto spacing = 18;
    auto singleWidth = (sliderRow.getWidth() - 2 * spacing) / 3;

    auto mixArea = sliderRow.removeFromLeft (singleWidth);
    dryWetLabel.setBounds (mixArea.removeFromTop (18));
    dryWetSlider.setBounds (mixArea);

    sliderRow.removeFromLeft (spacing);
    auto orbitArea = sliderRow.removeFromLeft (singleWidth);
    orbitLabel.setBounds (orbitArea.removeFromTop (18));
    orbitSlider.setBounds (orbitArea);

    sliderRow.removeFromLeft (spacing);
    auto gainArea = sliderRow.removeFromLeft (singleWidth);
    gainLabel.setBounds (gainArea.removeFromTop (18));
    gainSlider.setBounds (gainArea);

    bypassButton.setBounds (sliderInner.removeFromBottom (40).withWidth (110).removeFromRight (110));

    backgroundDirty = true;
}

//==============================================================================
void Species8AudioProcessorEditor::timerCallback()
{
    mutateGlowIntensity = juce::jmax (0.0f, mutateGlowIntensity * 0.94f - 0.0005f);
    backgroundPhase += 0.02f;
    if (backgroundPhase > juce::MathConstants<float>::twoPi)
        backgroundPhase -= juce::MathConstants<float>::twoPi;

    repaint();
}

void Species8AudioProcessorEditor::createPromptSuggestions()
{
    promptSuggestionButtons.clear();

    for (auto suggestion : defaultSuggestions)
    {
        auto* chip = promptSuggestionButtons.add (new juce::TextButton (suggestion));
        chip->setColour (juce::TextButton::buttonColourId, juce::Colour (0x20ffffff));
        chip->setColour (juce::TextButton::buttonOnColourId, juce::Colour (0x40ffffff));
        chip->setColour (juce::TextButton::textColourOffId, juce::Colour (0xfffdfdff));
        chip->setColour (juce::TextButton::textColourOnId, juce::Colour (0xffffffff));
        chip->setMouseCursor (juce::MouseCursor::PointingHandCursor);
        chip->onClick = [this, text = juce::String (suggestion)] { handleSuggestionClicked (text); };
        addAndMakeVisible (chip);
    }
}

void Species8AudioProcessorEditor::createPromptToolbar()
{
    promptToolbarButtons.clear();

    for (const auto& preset : toolbarPresets)
    {
        auto* btn = promptToolbarButtons.add (new juce::TextButton (preset.label));
        btn->setTooltip (preset.tooltip);
        btn->setColour (juce::TextButton::buttonColourId, juce::Colour (0x10ffffff));
        btn->setColour (juce::TextButton::buttonOnColourId, juce::Colour (0x30ffffff));
        btn->setColour (juce::TextButton::textColourOffId, juce::Colour (0xfffdfdff));
        btn->setColour (juce::TextButton::textColourOnId, juce::Colour (0xffffffff));
        btn->setMouseCursor (juce::MouseCursor::PointingHandCursor);
        btn->setClickingTogglesState (false);
        btn->onClick = [this, phrase = juce::String (preset.phrase)] { handleToolbarClicked (phrase); };
        addAndMakeVisible (btn);
    }
}

void Species8AudioProcessorEditor::handleSuggestionClicked (const juce::String& text)
{
    auto current = promptTextEditor.getText().trim();
    juce::String updated = current.isEmpty() ? text : current + ", " + text;
    promptTextEditor.setText (updated, juce::dontSendNotification);
    promptTextEditor.moveCaretToEnd();
}

void Species8AudioProcessorEditor::handleToolbarClicked (const juce::String& text)
{
    handleSuggestionClicked (text);
    mutateGlowIntensity = 1.0f;
}

void Species8AudioProcessorEditor::handleFileBrowse()
{
    fileChooser = std::make_unique<juce::FileChooser> ("Select audio to mutate",
                                                       juce::File {},
                                                       "*.wav;*.aif;*.aiff;*.mp3;*.flac;*.ogg");

    auto chooserFlags = juce::FileBrowserComponent::openMode | juce::FileBrowserComponent::canSelectFiles;
    fileChooser->launchAsync (chooserFlags,
        [this] (const juce::FileChooser& fc)
        {
            auto result = fc.getResult();
            if (! result.existsAsFile())
                return;

            if (audioProcessor.loadAudioFile (result))
                dragDropComponent.refreshFromProcessor();
            else
                juce::AlertWindow::showMessageBoxAsync (juce::AlertWindow::WarningIcon,
                                                        "Load Error",
                                                        "That file could not be loaded. Try another format.");
        });
}

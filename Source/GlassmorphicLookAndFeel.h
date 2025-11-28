/*
  ==============================================================================
    GlassmorphicLookAndFeel.h
    Part of Species 8 - Sound Design Plugin

    Custom glassmorphic styling for modern, minimal UI
  ==============================================================================
*/

#pragma once

#include <juce_gui_basics/juce_gui_basics.h>

/**
 * @brief Custom LookAndFeel with glassmorphic styling
 *
 * Features:
 * - Frosted glass effect with blur
 * - Minimal, sleek design
 * - Smooth gradients and glows
 * - Modern typography
 */
class GlassmorphicLookAndFeel : public juce::LookAndFeel_V4
{
public:
    GlassmorphicLookAndFeel()
    {
        // Dark theme colors
        setColour (juce::ResizableWindow::backgroundColourId, juce::Colour (0xff0a0a14));
        setColour (juce::TextButton::buttonColourId, juce::Colour (0x409f7bff));
        setColour (juce::TextButton::buttonOnColourId, juce::Colour (0x609f7bff));
        setColour (juce::TextEditor::backgroundColourId, juce::Colour (0x20ffffff));
        setColour (juce::TextEditor::outlineColourId, juce::Colour (0x409f7bff));
    }

    void drawRotarySlider (juce::Graphics& g, int x, int y, int width, int height,
                           float sliderPos, float rotaryStartAngle, float rotaryEndAngle,
                           juce::Slider& slider) override
    {
        auto bounds = juce::Rectangle<int> (x, y, width, height).toFloat().reduced (10);
        auto radius = juce::jmin (bounds.getWidth(), bounds.getHeight()) / 2.0f;
        auto centreX = bounds.getCentreX();
        auto centreY = bounds.getCentreY();
        auto angle = rotaryStartAngle + sliderPos * (rotaryEndAngle - rotaryStartAngle);

        // Outer glow
        g.setColour (juce::Colour (0x209f7bff));
        g.fillEllipse (bounds.expanded (4.0f));

        // Glass circle background
        g.setGradientFill (juce::ColourGradient (
            juce::Colour (0x30ffffff), centreX, centreY - radius,
            juce::Colour (0x10ffffff), centreX, centreY + radius,
            false));
        g.fillEllipse (bounds);

        // Border
        g.setColour (juce::Colour (0x609f7bff));
        g.drawEllipse (bounds, 2.0f);

        // Value arc
        juce::Path valueArc;
        valueArc.addCentredArc (centreX, centreY, radius - 4, radius - 4,
                                0.0f, rotaryStartAngle, angle, true);

        g.setColour (juce::Colour (0xff9f7bff));
        g.strokePath (valueArc, juce::PathStrokeType (4.0f, juce::PathStrokeType::curved));

        // Pointer
        juce::Path pointer;
        auto pointerLength = radius * 0.6f;
        auto pointerThickness = 3.0f;
        pointer.addRectangle (-pointerThickness * 0.5f, -radius + 8, pointerThickness, pointerLength);

        g.setColour (juce::Colours::white);
        g.fillPath (pointer, juce::AffineTransform::rotation (angle).translated (centreX, centreY));
    }

    void drawButtonBackground (juce::Graphics& g, juce::Button& button, const juce::Colour&,
                               bool shouldDrawButtonAsHighlighted, bool shouldDrawButtonAsDown) override
    {
        auto bounds = button.getLocalBounds().toFloat().reduced (2);

        // Glow effect
        g.setColour (juce::Colour (0x409f7bff));
        g.fillRoundedRectangle (bounds.expanded (2), 20.0f);

        // Glass background
        auto gradient = juce::ColourGradient (
            juce::Colour (0x409f7bff), 0, bounds.getY(),
            juce::Colour (0x20d5c7ff), 0, bounds.getBottom(),
            false);
        g.setGradientFill (gradient);
        g.fillRoundedRectangle (bounds, 20.0f);

        // Highlight state
        if (shouldDrawButtonAsHighlighted || shouldDrawButtonAsDown)
        {
            g.setColour (juce::Colour (0x209f7bff));
            g.fillRoundedRectangle (bounds, 20.0f);
        }

        // Border
        g.setColour (juce::Colour (0x809f7bff));
        g.drawRoundedRectangle (bounds, 20.0f, 2.0f);
    }

    void drawButtonText (juce::Graphics& g, juce::TextButton& button,
                         bool, bool) override
    {
        g.setColour (juce::Colours::white);
        g.setFont (juce::FontOptions (16.0f, juce::Font::bold));
        g.drawText (button.getButtonText(), button.getLocalBounds(),
                    juce::Justification::centred, true);
    }

    void drawTextEditorOutline (juce::Graphics& g, int width, int height, juce::TextEditor& editor) override
    {
        if (editor.isEnabled())
        {
            if (editor.hasKeyboardFocus (true))
            {
                g.setColour (juce::Colour (0x809f7bff));
                g.drawRect (0, 0, width, height, 2);
            }
            else
            {
                g.setColour (juce::Colour (0x409f7bff));
                g.drawRect (0, 0, width, height, 1);
            }
        }
    }

private:
    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (GlassmorphicLookAndFeel)
};

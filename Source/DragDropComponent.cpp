/*
  ==============================================================================
    DragDropComponent.cpp
    Part of Species 8 - Sound Design Plugin
  ==============================================================================
*/

#include "DragDropComponent.h"
#include "PluginProcessor.h"

DragDropComponent::DragDropComponent (Species8AudioProcessor& proc)
    : processor (proc)
{
    addAndMakeVisible (waveformDisplay);
}

DragDropComponent::~DragDropComponent()
{
}

bool DragDropComponent::isInterestedInFileDrag (const juce::StringArray& files)
{
    // Check if any file has an audio extension
    for (const auto& file : files)
    {
        if (file.endsWithIgnoreCase (".wav") ||
            file.endsWithIgnoreCase (".aif") ||
            file.endsWithIgnoreCase (".aiff") ||
            file.endsWithIgnoreCase (".mp3") ||
            file.endsWithIgnoreCase (".flac") ||
            file.endsWithIgnoreCase (".ogg"))
        {
            return true;
        }
    }

    return false;
}

void DragDropComponent::filesDropped (const juce::StringArray& files, int x, int y)
{
    juce::ignoreUnused (x, y);
    isDraggingOver = false;

    if (files.isEmpty())
        return;

    // Load the first file
    juce::File audioFile (files[0]);

    if (processor.loadAudioFile (audioFile))
    {
        // Update waveform display
        waveformDisplay.setAudioBuffer (processor.getLoadedSampleBuffer(),
                                       processor.getLoadedSampleRate());

        DBG ("Loaded audio file: " << audioFile.getFileName());
    }
    else
    {
        DBG ("Failed to load audio file: " << audioFile.getFileName());
        juce::AlertWindow::showMessageBoxAsync (
            juce::AlertWindow::WarningIcon,
            "Load Error",
            "Could not load the audio file. Please try a different file.",
            "OK");
    }

    repaint();
}

void DragDropComponent::fileDragEnter (const juce::StringArray& files, int x, int y)
{
    juce::ignoreUnused (files, x, y);
    isDraggingOver = true;
    repaint();
}

void DragDropComponent::fileDragExit (const juce::StringArray& files)
{
    juce::ignoreUnused (files);
    isDraggingOver = false;
    repaint();
}

void DragDropComponent::paint (juce::Graphics& g)
{
    if (isDraggingOver)
    {
        // Highlight when dragging
        g.setColour (juce::Colour (0xff9f7bff).withAlpha (0.3f));
        g.fillRoundedRectangle (getLocalBounds().toFloat(), 8.0f);

        g.setColour (juce::Colour (0xff9f7bff));
        g.drawRoundedRectangle (getLocalBounds().toFloat().reduced (2.0f), 8.0f, 3.0f);
    }
}

void DragDropComponent::resized()
{
    waveformDisplay.setBounds (getLocalBounds());
}

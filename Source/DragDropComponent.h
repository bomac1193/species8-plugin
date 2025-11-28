/*
  ==============================================================================
    DragDropComponent.h
    Part of Species 8 - Sound Design Plugin

    Component that handles drag & drop of audio files
  ==============================================================================
*/

#pragma once

#include <juce_gui_basics/juce_gui_basics.h>
#include <juce_audio_formats/juce_audio_formats.h>
#include "WaveformDisplay.h"

class Species8AudioProcessor;

/**
 * @brief Component that accepts drag-and-drop audio files
 *
 * Combines file dropping with waveform visualization.
 * Accepts WAV, AIFF, and other common audio formats.
 */
class DragDropComponent : public juce::Component,
                          public juce::FileDragAndDropTarget
{
public:
    explicit DragDropComponent (Species8AudioProcessor& proc);
    ~DragDropComponent() override;

    // FileDragAndDropTarget interface
    bool isInterestedInFileDrag (const juce::StringArray& files) override;
    void filesDropped (const juce::StringArray& files, int x, int y) override;
    void fileDragEnter (const juce::StringArray& files, int x, int y) override;
    void fileDragExit (const juce::StringArray& files) override;

    void paint (juce::Graphics& g) override;
    void resized() override;
    void refreshFromProcessor();

private:
    Species8AudioProcessor& processor;
    WaveformDisplay waveformDisplay;
    bool isDraggingOver = false;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (DragDropComponent)
};

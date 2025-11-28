cmake_minimum_required(VERSION 3.15)

project(Species8 VERSION 1.0.0)

# Add JUCE (assuming JUCE is available via find_package or add_subdirectory)
# You'll need to either:
# 1. Set JUCE_DIR to your JUCE installation
# 2. Or use: add_subdirectory(path/to/JUCE)
# 3. Or use CPM/FetchContent to download JUCE

# Example using find_package (requires JUCE to be installed)
# find_package(JUCE CONFIG REQUIRED)

# Example using add_subdirectory (if you have JUCE as a git submodule)
add_subdirectory(JUCE)

# For this template, assuming you'll add JUCE manually
# Uncomment one of the above methods based on your setup

juce_add_plugin(Species8
    COMPANY_NAME "Species Audio"
    IS_SYNTH FALSE
    NEEDS_MIDI_INPUT FALSE
    NEEDS_MIDI_OUTPUT FALSE
    IS_MIDI_EFFECT FALSE
    EDITOR_WANTS_KEYBOARD_FOCUS TRUE
    COPY_PLUGIN_AFTER_BUILD TRUE
    PLUGIN_MANUFACTURER_CODE Spec
    PLUGIN_CODE Sp08
    FORMATS AU VST3 Standalone
    PRODUCT_NAME "Species 8")

target_sources(Species8
    PRIVATE
        Source/PluginProcessor.cpp
        Source/PluginEditor.cpp
        Source/StereoWidthProcessor.cpp
        Source/WaveformDisplay.cpp
        Source/DragDropComponent.cpp
        Source/GlassmorphicLookAndFeel.cpp
        Source/MascotComponent.cpp)

target_compile_definitions(Species8
    PUBLIC
        JUCE_WEB_BROWSER=0
        JUCE_USE_CURL=0
        JUCE_VST3_CAN_REPLACE_VST2=0)

target_link_libraries(Species8
    PRIVATE
        juce::juce_audio_utils
        juce::juce_audio_formats
        juce::juce_dsp
        asound
    PUBLIC
        juce::juce_recommended_config_flags
        juce::juce_recommended_lto_flags
        juce::juce_recommended_warning_flags)

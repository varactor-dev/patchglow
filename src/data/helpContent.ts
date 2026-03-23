export interface ModuleHelp {
  tooltip: string;
  whatItDoes: string;
  signalFlow: string;
  controls: { name: string; description: string; tryThis: string }[];
  ports: {
    name: string;
    type: 'audio' | 'cv' | 'gate';
    direction: 'in' | 'out';
    connectTo: string;
  }[];
  vizGuide: string;
  tryThis: string;
}

export const helpContent: Record<string, ModuleHelp> = {
  oscillator: {
    tooltip:
      'The Oscillator is where sound begins. It generates a continuous tone by vibrating the air at a specific speed (frequency). Think of it like a vocal cord or a vibrating guitar string — the starting point of any sound.',
    whatItDoes:
      'An oscillator creates a repeating wave pattern that your speakers turn into sound. The shape of the wave determines the character, or "timbre," of the sound — a sine wave sounds smooth and pure like a flute, while a sawtooth wave sounds bright and buzzy like a bowed string. The frequency controls how high or low the pitch is: lower numbers make deep bass notes, higher numbers make high-pitched tones. Detune shifts the pitch by tiny amounts, which is great for making the sound feel thicker when combined with a second oscillator.',
    signalFlow: 'Parameters set shape and pitch -> Wave generated -> Audio Out',
    controls: [
      {
        name: 'Frequency',
        description:
          'Sets the pitch of the sound, measured in Hertz (Hz). 440 Hz is the note A above middle C. Lower values create bass sounds, higher values create treble.',
        tryThis:
          'Turn the frequency knob slowly from left to right. Listen to how the pitch rises from a deep rumble all the way to a high whine. Stop somewhere around 440 Hz — that is the standard tuning note.',
      },
      {
        name: 'Detune',
        description:
          'Shifts the pitch slightly up or down in "cents" (hundredths of a semitone). This is too subtle to sound like a different note, but it adds richness.',
        tryThis:
          'Set detune to 0, then slowly move it to the right. The sound gets slightly sharper. If you have two Oscillators, detune one by about 7 cents and mix them — you will hear a lush, chorus-like thickening.',
      },
      {
        name: 'Waveform',
        description:
          'Changes the shape of the wave. Sine is smooth and pure. Triangle is a little brighter. Sawtooth is buzzy and rich. Square is hollow and reedy.',
        tryThis:
          'Switch between the four waveforms while listening. Watch the oscilloscope display change shape at the same time — each sound has a visually distinct pattern. Sawtooth has the most harmonics, which makes it a great starting point for subtractive synthesis.',
      },
    ],
    ports: [
      {
        name: 'OUT',
        type: 'audio',
        direction: 'out',
        connectTo: 'Filter IN, VCA IN, Mixer CH1/CH2/CH3, Distortion IN, Delay IN, Reverb IN, or Output IN',
      },
      {
        name: 'V/OCT',
        type: 'cv',
        direction: 'in',
        connectTo: 'Keyboard CV OUT or Sequencer CV OUT — controls pitch with 1 volt per octave, so the oscillator plays the right notes',
      },
      {
        name: 'FM',
        type: 'cv',
        direction: 'in',
        connectTo: 'LFO OUT for vibrato, or another Oscillator OUT for wild FM synthesis timbres',
      },
    ],
    vizGuide:
      'The top panel shows the oscilloscope — the actual shape of the wave over time. You can see sine as a smooth curve, sawtooth as a ramp, square as flat tops and bottoms, and triangle as a zigzag. The bottom panel shows the frequency spectrum — tall bars on the left mean low frequencies are present, bars on the right mean high frequencies. A sine wave has just one bar; a sawtooth has many, getting shorter toward the right.',
    tryThis:
      'Start with a basic sound: connect the Oscillator OUT to the Output IN. You should hear a tone. Now add expression: connect a Keyboard module, running CV OUT to the Oscillator V/OCT and GATE OUT to an Envelope. Try different waveforms and watch how the spectrum display changes — the more bars you see, the brighter the sound.',
  },

  filter: {
    tooltip:
      'The Filter sculpts sound by removing certain frequencies. It is like an EQ on your music player, but more dramatic — it can make a bright buzzy tone sound warm and muffled, or thin and nasal.',
    whatItDoes:
      'A filter takes an incoming sound and removes some of its frequencies. A lowpass filter (the most common type) lets low frequencies through and cuts the highs — turn the cutoff knob down and a bright sawtooth wave gradually becomes dark and muffled, like putting a blanket over a speaker. A highpass filter does the opposite: it removes the bass, making things sound thin. A bandpass filter keeps only a narrow band of frequencies, creating a vocal or "wah" quality. The resonance control boosts frequencies right at the cutoff point, adding a sharp, whistling peak that makes the filter sound more dramatic.',
    signalFlow: 'Audio In -> Frequencies removed based on cutoff and type -> Audio Out',
    controls: [
      {
        name: 'Frequency (Cutoff)',
        description:
          'Sets where the filter starts cutting frequencies. In lowpass mode, everything above this frequency gets quieter. Measured in Hz, same as pitch — 200 Hz is bassy, 5000 Hz is bright.',
        tryThis:
          'Connect a sawtooth Oscillator into the Filter and listen to the output. Start with the cutoff all the way up (you hear everything), then slowly turn it down. Listen to the brightness disappear. Watch the frequency response curve in the display shift to the left as you turn down the cutoff.',
      },
      {
        name: 'Resonance',
        description:
          'Boosts the frequencies right at the cutoff point, creating a sharp peak. At low values it is subtle; at high values the filter starts to ring and whistle.',
        tryThis:
          'Set the cutoff to about halfway and slowly increase the resonance. You will hear a growing "whistle" or "wah" at the cutoff frequency. Watch the display — a bump grows taller at the cutoff point. At very high resonance, the filter almost sings on its own.',
      },
      {
        name: 'Type',
        description:
          'Lowpass removes highs (warm, muffled). Highpass removes lows (thin, crisp). Bandpass keeps only a narrow band in the middle (nasal, vocal).',
        tryThis:
          'Switch between lowpass, highpass, and bandpass while a sawtooth Oscillator plays through the filter. Each type has a dramatically different character. Watch the frequency response curve change shape — lowpass slopes down to the right, highpass slopes down to the left, and bandpass is a hill in the middle.',
      },
    ],
    ports: [
      {
        name: 'IN',
        type: 'audio',
        direction: 'in',
        connectTo: 'Oscillator OUT, Noise OUT, or any audio source',
      },
      {
        name: 'OUT',
        type: 'audio',
        direction: 'out',
        connectTo: 'VCA IN, Mixer channel, Delay IN, Output IN, or another effect',
      },
      {
        name: 'FREQ CV',
        type: 'cv',
        direction: 'in',
        connectTo: 'LFO OUT for a "wah-wah" effect, Envelope OUT for plucky sounds that start bright and get dark, or Keyboard CV OUT to make the filter track pitch',
      },
    ],
    vizGuide:
      'The display shows a frequency response curve — a line that shows which frequencies get through and which get cut. The horizontal axis is frequency (low on the left, high on the right). Where the line is high, sound passes through. Where it drops off, sound is removed. The bump at the cutoff point gets taller as you increase resonance.',
    tryThis:
      'Build a classic synth patch: Oscillator (sawtooth) into Filter (lowpass) into Output. Now connect an LFO to the Filter FREQ CV input. Set the LFO rate to about 2 Hz. You will hear the cutoff sweep up and down automatically, creating a rhythmic "wah-wah" effect. Adjust the LFO depth and filter resonance to shape the sound.',
  },

  envelope: {
    tooltip:
      'The Envelope shapes how a sound changes over time — how quickly it starts, how it fades while you hold a note, and how it dies away when you let go. It turns a flat, constant tone into something that feels alive.',
    whatItDoes:
      'An envelope generator creates a control signal that changes over time whenever it receives a trigger (called a "gate" — like pressing a key). It follows four stages: Attack is how long it takes to reach full volume after you press a key. Decay is how long it takes to fall from the peak to the sustain level. Sustain is the steady level the sound holds while you keep the key pressed. Release is how long it takes to fade to silence after you let go. Together, these four stages are called ADSR. A piano has a fast attack, short decay, low sustain, and medium release. A pad sound has a slow attack, no decay, full sustain, and long release.',
    signalFlow: 'Gate signal received -> Attack rises -> Decay falls to Sustain -> Gate released -> Release fades to zero -> CV Out',
    controls: [
      {
        name: 'Attack',
        description:
          'How long it takes for the sound to reach its peak after a note begins. Short attack (near 0) means the sound starts instantly, like a drum hit. Long attack means it swells in slowly, like a violin.',
        tryThis:
          'Set attack very short (near 0) and play some notes — they start immediately. Now increase attack to about 1 second. The sound fades in gently each time you press a key. Watch the ADSR curve display change — the rising part on the left gets longer.',
      },
      {
        name: 'Decay',
        description:
          'After reaching its peak, how long the sound takes to settle down to the sustain level. A short decay makes a plucky, percussive sound. A long decay makes a gradual transition.',
        tryThis:
          'Set sustain to about halfway, then adjust decay from short to long. With short decay, you hear a quick "plink" that settles fast. With long decay, the initial brightness fades slowly. Watch the second segment of the ADSR curve stretch and shrink.',
      },
      {
        name: 'Sustain',
        description:
          'The level the sound holds at while you keep a note pressed. This is not a time — it is a volume level. At 1 (full), there is no decay at all. At 0, the sound dies away completely even while you hold the key.',
        tryThis:
          'Hold a note and adjust sustain. At full sustain, the sound stays loud as long as you hold the key. Bring sustain to zero — now the sound fades away even while you hold the key, like a plucked string. The flat middle section of the ADSR display rises and falls with this control.',
      },
      {
        name: 'Release',
        description:
          'How long the sound takes to fade to silence after you let go of a note. Short release cuts off immediately. Long release lets the sound ring out like a piano with the sustain pedal down.',
        tryThis:
          'Play short, staccato notes and adjust release. With short release, notes cut off crisply. Increase release to 2 seconds or more — now notes linger and overlap, creating a dreamy, ambient feel. The tail end of the ADSR curve stretches out.',
      },
    ],
    ports: [
      {
        name: 'GATE',
        type: 'gate',
        direction: 'in',
        connectTo: 'Keyboard GATE OUT or Sequencer GATE OUT — tells the envelope when a note starts and stops',
      },
      {
        name: 'OUT',
        type: 'cv',
        direction: 'out',
        connectTo: 'VCA CV for volume shaping (most common), Filter FREQ CV to make the tone brighter on attack then darker as the note fades, or Oscillator FM for pitch effects',
      },
      {
        name: 'INV',
        type: 'cv',
        direction: 'out',
        connectTo: 'Filter FREQ CV for a sound that starts dark and gets brighter (the opposite of the normal envelope behavior)',
      },
    ],
    vizGuide:
      'The display draws the ADSR curve — a line that rises during attack, falls during decay, holds flat at the sustain level, then drops during release. When a gate is active, a glowing dot travels along this curve in real time, showing you exactly where in the envelope you are. This makes it easy to see the connection between what you hear and the shape of the curve.',
    tryThis:
      'Build a complete voice: Keyboard GATE OUT to Envelope GATE, Envelope OUT to VCA CV, then Oscillator into VCA into Output. Also connect Keyboard CV OUT to Oscillator V/OCT. Now when you press keys, the Envelope controls the volume shape of each note. Try a piano-like setting (fast attack, short decay, low sustain, medium release) versus a pad (slow attack, no decay, full sustain, long release).',
  },

  lfo: {
    tooltip:
      'The LFO (Low Frequency Oscillator) is like a robot hand slowly turning a knob for you. It creates a repeating wave too slow to hear as a note, but perfect for adding movement — vibrato, tremolo, filter sweeps, and more.',
    whatItDoes:
      'An LFO works just like a regular Oscillator, but it runs at very low speeds — typically between 0.1 and 20 cycles per second. Instead of creating audible sound, it produces a slowly changing control signal that you send to other modules to create movement and variation. Connect it to an Oscillator frequency for vibrato (pitch wobble). Connect it to a VCA for tremolo (volume wobble). Connect it to a Filter cutoff for a rhythmic "wah" effect. The shape of the LFO wave determines the character of the movement: sine is smooth and gentle, square snaps between two values, and sawtooth creates a ramp that resets.',
    signalFlow: 'Rate and shape set -> Slow wave generated -> CV Out to control other modules',
    controls: [
      {
        name: 'Rate',
        description:
          'How fast the LFO cycles, in Hertz. 1 Hz means one full cycle per second. Slow rates (0.1-1 Hz) create gentle sweeps. Faster rates (5-20 Hz) create more intense, wobbling effects.',
        tryThis:
          'Connect the LFO to a Filter FREQ CV input. Start with a slow rate around 0.5 Hz — you hear a leisurely sweep. Now increase the rate toward 10 Hz. The sweep becomes a rapid wobble. Watch the waveform display speed up as you turn the knob.',
      },
      {
        name: 'Shape',
        description:
          'The waveform shape of the LFO. Sine gives a smooth, natural sway. Triangle is similar but with sharper corners. Sawtooth ramps up and snaps back. Square jumps between two values instantly.',
        tryThis:
          'While the LFO is connected to something audible (like a Filter FREQ CV), switch between shapes. Sine sounds smooth and organic. Square creates an abrupt, rhythmic switching effect. Sawtooth makes a rising sweep that resets — like a siren. Watch the display change shape as you switch.',
      },
      {
        name: 'Depth',
        description:
          'How much effect the LFO has — the "size" of its movement. At 0, the LFO has no effect. At 1, it sweeps across the full range.',
        tryThis:
          'Start with depth at a low value and slowly increase it. The effect becomes more dramatic — a gentle vibrato becomes a wild pitch bend, or a subtle filter movement becomes a deep sweep. The wave in the display gets taller as depth increases.',
      },
    ],
    ports: [
      {
        name: 'OUT',
        type: 'cv',
        direction: 'out',
        connectTo: 'Filter FREQ CV for wah effects, Oscillator FM for vibrato, VCA CV for tremolo, or any CV input on any module',
      },
      {
        name: 'SYNC',
        type: 'gate',
        direction: 'in',
        connectTo: 'Sequencer GATE OUT or Keyboard GATE OUT — resets the LFO to the start of its wave on each trigger, locking it in rhythm with your notes',
      },
    ],
    vizGuide:
      'The display shows the LFO waveform with an animated playhead (a vertical line or dot) that moves across the wave, showing you the current position in the cycle. This is the value being sent out right now. When the playhead is at the top of the wave, the output value is at its maximum. When it is at the bottom, the output is at minimum.',
    tryThis:
      'Patch a classic vibrato: connect the LFO OUT to an Oscillator FM input. Set the LFO rate to about 5-6 Hz and keep the depth low. You will hear a natural vibrato, like a singer adding expression to a held note. Now try connecting the same LFO OUT to a Filter FREQ CV instead — same movement, completely different effect.',
  },

  vca: {
    tooltip:
      'The VCA (Voltage Controlled Amplifier) is a volume knob that can be controlled by other modules. It is how you turn a constant drone into notes with beginnings and endings — the Envelope tells the VCA when to let sound through.',
    whatItDoes:
      'A VCA controls how loud a signal is, but unlike a regular volume knob, it can be controlled automatically by a control voltage (CV). This is what makes notes possible in a modular synth. By itself, an Oscillator just drones constantly. But if you put a VCA between the Oscillator and the Output, and then connect an Envelope to the VCA CV input, the Envelope opens and closes the VCA like a gate — sound passes through when the envelope is high, and gets quiet when the envelope is low. The level knob sets a base volume, but the magic happens when CV takes over.',
    signalFlow: 'Audio In -> Volume controlled by CV signal and Level knob -> Audio Out',
    controls: [
      {
        name: 'Level',
        description:
          'Sets the base volume level. When no CV cable is connected, this directly controls how much sound passes through. When CV is connected, this acts as an additional gain control.',
        tryThis:
          'Connect an Oscillator through the VCA to the Output. With no CV connected, turn the Level knob — it works like a simple volume control. Now connect an Envelope CV to the VCA CV input. The Level knob now sets the maximum volume the Envelope can reach.',
      },
    ],
    ports: [
      {
        name: 'IN',
        type: 'audio',
        direction: 'in',
        connectTo: 'Oscillator OUT, Filter OUT, Mixer OUT, or any audio signal you want to control the volume of',
      },
      {
        name: 'OUT',
        type: 'audio',
        direction: 'out',
        connectTo: 'Output IN, Mixer channel, Delay IN, or another effect in the chain',
      },
      {
        name: 'CV',
        type: 'cv',
        direction: 'in',
        connectTo: 'Envelope OUT for note shaping (most common), LFO OUT for tremolo, or Sample & Hold OUT for random volume steps',
      },
    ],
    vizGuide:
      'The display shows three stacked waveform panels. The top panel shows the incoming audio signal (what is coming IN). The middle panel shows the CV control signal (the shape controlling the volume). The bottom panel shows the output — you can see how the audio is being "shaped" by the CV. When the CV is high, the output looks like the input. When the CV is low, the output shrinks to nothing.',
    tryThis:
      'Build a tremolo effect: connect an Oscillator to the VCA, then VCA to the Output. Now connect an LFO to the VCA CV input. Set the LFO to a sine wave at about 4 Hz. You will hear the volume pulsing rhythmically. Watch the three panels in the display — you can see the LFO wave in the middle panel literally shaping the audio in the bottom panel.',
  },

  mixer: {
    tooltip:
      'The Mixer combines up to three audio signals into one output. Use it to blend multiple Oscillators together, combine a dry signal with an effect, or merge any sounds before they reach the Output.',
    whatItDoes:
      'A mixer takes multiple audio signals and blends them into a single output. Each channel has its own volume control, so you can balance the levels of different sources. This is essential when you have more than one sound source — for example, two Oscillators slightly detuned from each other, or a mix of an Oscillator and a Noise module. Without a mixer, you would need a separate Output for each source. The mixer lets you combine everything and control the balance before sending it downstream.',
    signalFlow: 'Audio In (CH1 + CH2 + CH3) -> Volume balanced per channel -> Combined Audio Out',
    controls: [
      {
        name: 'CH1',
        description:
          'Volume level for channel 1. At 0 the channel is silent, at 1 it is at full volume.',
        tryThis:
          'Connect a sound source to CH1 and turn the knob up from zero. Watch the level meter for CH1 light up as you increase the volume. If you have a second source on CH2, try balancing the two levels until they blend nicely.',
      },
      {
        name: 'CH2',
        description:
          'Volume level for channel 2, independent from the others. Same range as CH1.',
        tryThis:
          'Connect a different sound source — maybe a Noise module or a second Oscillator with a different waveform. Blend it with CH1. Even small amounts of noise (CH2 around 0.1) can add texture and air to a sound.',
      },
    ],
    ports: [
      {
        name: 'CH1',
        type: 'audio',
        direction: 'in',
        connectTo: 'Any audio source — Oscillator OUT, Filter OUT, VCA OUT, etc.',
      },
      {
        name: 'CH2',
        type: 'audio',
        direction: 'in',
        connectTo: 'A second audio source to blend with CH1',
      },
      {
        name: 'CH3',
        type: 'audio',
        direction: 'in',
        connectTo: 'A third audio source — the channel level defaults to full volume',
      },
      {
        name: 'OUT',
        type: 'audio',
        direction: 'out',
        connectTo: 'Output IN, Filter IN, VCA IN, Delay IN, or any module that accepts audio',
      },
    ],
    vizGuide:
      'The display shows vertical level meters — one bar for each active channel plus the combined output. The bars bounce up and down with the audio level, like the meters on a mixing console. Taller bars mean louder signals. The output meter shows the combined result of all channels.',
    tryThis:
      'Create a rich, layered sound: connect two Oscillators to CH1 and CH2. Set one to sawtooth and the other to a square wave, slightly detuned. Adjust the channel levels to find a good balance — try CH1 at 0.7 and CH2 at 0.4 for a sawtooth-dominant blend. Then send the Mixer output through a Filter to shape the combined sound.',
  },

  keyboard: {
    tooltip:
      'The Keyboard lets you play notes using your computer keys (A through K for one octave, W-E-T-Y-U for sharps/flats). It sends pitch information (CV) and key press signals (Gate) to control Oscillators and Envelopes.',
    whatItDoes:
      'The Keyboard module turns your computer keyboard into a musical instrument. When you press a key, two things happen: the CV output sends a voltage that corresponds to the note you pressed (this controls the pitch of an Oscillator), and the Gate output sends an "on" signal (this tells an Envelope that a note has started). When you release the key, the gate goes off, telling the Envelope the note has ended. This two-signal system (CV for pitch, Gate for timing) is how modular synthesizers separate "which note" from "when the note happens," giving you incredible flexibility.',
    signalFlow: 'Key pressed -> CV Out sends pitch voltage + Gate Out sends on signal -> Key released -> Gate Out sends off signal',
    controls: [],
    ports: [
      {
        name: 'CV OUT',
        type: 'cv',
        direction: 'out',
        connectTo: 'Oscillator V/OCT to control its pitch — each key sends a different voltage so you hear different notes',
      },
      {
        name: 'GATE OUT',
        type: 'gate',
        direction: 'out',
        connectTo: 'Envelope GATE to trigger the volume shape of each note, or LFO SYNC to restart the LFO on each key press',
      },
    ],
    vizGuide:
      'The display shows a piano keyboard. When you press a computer key, the corresponding piano key lights up on screen. This helps you see which note you are playing and understand the mapping from your computer keyboard to musical notes.',
    tryThis:
      'Build a playable synth: add an Oscillator, Envelope, VCA, and Output. Connect Keyboard CV OUT to Oscillator V/OCT, Keyboard GATE OUT to Envelope GATE, Envelope OUT to VCA CV, Oscillator OUT to VCA IN, and VCA OUT to Output IN. Now press the A key — you will hear a note. Press different keys to play a melody. Each key plays a different pitch, and the Envelope gives each note a natural shape.',
  },

  output: {
    tooltip:
      'The Output module is the final stop — it sends audio to your speakers or headphones. Everything you want to hear must eventually reach this module. It also shows you what the final sound looks like.',
    whatItDoes:
      'The Output module is the destination for all sound in your patch. It takes the incoming audio signal and sends it to your computer speakers or headphones. Without it, nothing is audible — sound can be flowing through your entire patch, but if it never reaches the Output, you will not hear it. The volume knob controls the overall loudness, measured in decibels (dB). The display gives you a comprehensive view of your final sound with a waveform, level meter, and spectrum analysis.',
    signalFlow: 'Audio In -> Volume adjusted -> Speakers/Headphones',
    controls: [
      {
        name: 'Volume',
        description:
          'Controls the final output loudness in decibels (dB). 0 dB is full volume. -60 dB is effectively silent. A good starting level is around -12 dB to avoid clipping (distorted, harsh sounds from being too loud).',
        tryThis:
          'Start with the volume low (around -20 dB) and gradually increase it. Watch the level meter — if it is constantly hitting the top (red), turn it down a bit. Your ears will thank you. A level that sits in the green and occasionally touches yellow is a good target.',
      },
    ],
    ports: [
      {
        name: 'IN',
        type: 'audio',
        direction: 'in',
        connectTo: 'VCA OUT (most common in a full patch), Mixer OUT, Filter OUT, Oscillator OUT (for quick testing), or the final module in your effects chain',
      },
    ],
    vizGuide:
      'The Output has a three-panel display. The oscilloscope shows the waveform — the actual shape of the sound wave over time. The level meter shows how loud the signal is in real time, with green (safe), yellow (getting loud), and red (too loud, clipping). The spectrum analyzer shows which frequencies are present in the sound — low notes light up the left side, high notes light up the right side.',
    tryThis:
      'Connect an Oscillator directly to the Output to test it quickly and confirm you can hear sound. Then start building up your patch between the Oscillator and the Output. The Output display is your best friend for understanding your sound — use the spectrum analyzer to see how adding a Filter changes which frequencies are present, or watch the waveform to see how Distortion reshapes the wave.',
  },

  sequencer: {
    tooltip:
      'The Sequencer plays a pattern of notes automatically, like a drum machine or a music box. You set the notes in each step, and the Sequencer cycles through them at a steady tempo, sending pitch and gate signals just like a Keyboard.',
    whatItDoes:
      'A step sequencer is an automatic note player. You set up a series of steps (up to 16), and each step has a pitch value. The sequencer moves through these steps one by one at a speed set by the tempo control, sending out the corresponding pitch as a CV signal and a gate pulse on each step. It is like having a tiny robot play the keyboard for you in a repeating loop. This is the foundation of electronic music — repeating, evolving patterns that you can shape in real time by adjusting filters, effects, and modulation while the sequencer keeps playing.',
    signalFlow: 'Tempo drives step forward -> Current step pitch sent as CV Out -> Gate pulse sent on each step -> Pattern loops',
    controls: [
      {
        name: 'Tempo',
        description:
          'How fast the pattern plays, in BPM (beats per minute). 120 BPM is a standard dance tempo. Lower values are slower and more relaxed; higher values are frantic.',
        tryThis:
          'Start at 120 BPM and listen to the rhythm. Slow it down to 60 BPM for a chill, half-speed feel. Crank it up to 200+ BPM for a rapid-fire arpeggio. Watch the active step highlight move faster or slower across the grid display.',
      },
      {
        name: 'Gate Length',
        description:
          'How long each note lasts relative to the step, as a percentage. At 10%, notes are very short and staccato. At 90%, notes nearly overlap, creating a legato feel.',
        tryThis:
          'Set gate length to about 20% for short, punchy notes. Now increase it to 80% — the notes become long and connected. If you have an Envelope with a long release, short gates give you plucky sounds while long gates let the sustain portion ring out.',
      },
      {
        name: 'Step Count',
        description:
          'How many steps the pattern has before it loops. A 4-step pattern repeats quickly. A 16-step pattern gives you a longer, more complex melody. Odd numbers like 5 or 7 create patterns that feel less predictable.',
        tryThis:
          'Start with 4 steps for a simple repeating motif. Then increase to 7 steps — the odd count makes the pattern phase against a normal 4-beat rhythm, creating a hypnotic effect. Try 16 steps for a full, complex melody.',
      },
    ],
    ports: [
      {
        name: 'CV OUT',
        type: 'cv',
        direction: 'out',
        connectTo: 'Oscillator V/OCT to control pitch, or Filter FREQ CV to create a rhythmic filter pattern',
      },
      {
        name: 'GATE OUT',
        type: 'gate',
        direction: 'out',
        connectTo: 'Envelope GATE to trigger the note shape on each step, or LFO SYNC to reset the LFO on each step',
      },
      {
        name: 'CLOCK IN',
        type: 'gate',
        direction: 'in',
        connectTo: 'An external clock source — overrides the internal tempo so multiple sequencers can stay in sync',
      },
      {
        name: 'RESET',
        type: 'gate',
        direction: 'in',
        connectTo: 'A gate source to restart the pattern from step 1 — useful for keeping a long sequence aligned to a specific moment',
      },
    ],
    vizGuide:
      'The display shows an interactive grid where each column is a step and the height of the bar represents the pitch. Note names are shown on the bars so you can see which musical notes you have programmed. The currently active step is highlighted as it plays, moving from left to right across the grid and looping back to the beginning.',
    tryThis:
      'Build an automatic melody: connect Sequencer CV OUT to an Oscillator V/OCT, and Sequencer GATE OUT to an Envelope GATE. Then wire the Envelope to a VCA controlling the Oscillator signal going to the Output. Click on the step grid to set different pitches. Hit play and you will hear your pattern repeat. Now try turning the Filter cutoff or adding Delay while the sequence plays — this is how electronic music is performed live.',
  },

  noise: {
    tooltip:
      'The Noise module generates random, unpitched sound — like radio static, a waterfall, or wind. It is useful for percussion, adding texture, or creating sound effects. Different noise colors have different frequency balances.',
    whatItDoes:
      'A noise generator creates random sound with no definite pitch. Unlike an Oscillator, which produces a specific note, noise contains all frequencies playing at once in random patterns. "White noise" is like TV static — all frequencies at equal volume, which sounds bright and hissy. "Pink noise" rolls off the high frequencies, sounding more balanced and natural, like a waterfall. "Brown noise" rolls off even more highs, sounding deep and rumbly, like distant thunder. Noise is a building block for percussion sounds (snare drums, hi-hats), wind and ocean effects, and adding "air" or texture to other sounds.',
    signalFlow: 'Noise type selected -> Random signal generated -> Level adjusted -> Audio Out',
    controls: [
      {
        name: 'Type',
        description:
          'White noise has equal energy at all frequencies (bright, hissy). Pink noise drops off at higher frequencies (balanced, natural). Brown noise drops off more steeply (deep, rumbly).',
        tryThis:
          'Switch between white, pink, and brown noise. White sounds like static. Pink sounds like rain or a waterfall. Brown sounds like rumbling wind. Watch the spectrum display change — white is flat across all frequencies, pink slopes down to the right, and brown slopes down more steeply.',
      },
      {
        name: 'Level',
        description:
          'Controls the volume of the noise output. At 0 it is silent, at 1 it is full volume.',
        tryThis:
          'Start with the level low and gradually bring it up. Even a tiny amount of noise (0.05-0.1) mixed with an Oscillator through a Mixer can add a "breathy" quality that makes the sound feel more organic and alive.',
      },
    ],
    ports: [
      {
        name: 'OUT',
        type: 'audio',
        direction: 'out',
        connectTo: 'Filter IN to sculpt the noise, Mixer channel to blend with other sounds, VCA IN for gated noise bursts, or Output IN to hear it directly',
      },
    ],
    vizGuide:
      'The top panel shows a chaotic, jumpy waveform — unlike the smooth, repeating waves of an Oscillator, noise has no pattern and looks like a scribble. The bottom panel shows the frequency spectrum. White noise has a roughly flat spectrum. Pink and brown noise slope downward from left to right, showing that high frequencies have less energy.',
    tryThis:
      'Build a simple snare drum: connect Noise (white) to a Filter (bandpass, cutoff around 1000 Hz) to a VCA to the Output. Connect an Envelope to the VCA CV with very short attack, short decay, zero sustain, and short release. Trigger the Envelope with a Sequencer gate. Each step triggers a short burst of filtered noise — a basic snare hit.',
  },

  delay: {
    tooltip:
      'The Delay creates echoes by recording the incoming sound and playing it back after a short time. The feedback control lets echoes repeat, fading out gradually. It adds rhythm, depth, and space to any sound.',
    whatItDoes:
      'A delay takes an incoming audio signal, stores it briefly, and plays it back after a set amount of time — creating an echo. The delay time controls how long the gap is between the original sound and its echo. The feedback control sends the echo back into the delay, creating multiple repeating echoes that gradually fade out — like shouting into a canyon. The mix control blends the dry (original) signal with the wet (delayed) signal. Short delay times create doubling and slapback effects. Longer times create distinct, rhythmic echoes. High feedback creates cascading trails of repeating echoes.',
    signalFlow: 'Audio In -> Signal copied and held -> Played back after delay time -> Feedback sends echo back in -> Dry/Wet mixed -> Audio Out',
    controls: [
      {
        name: 'Time',
        description:
          'How long before the echo plays back, in seconds. Short times (0.01-0.1s) create a doubling or slapback effect. Longer times (0.3-1s) create distinct, separated echoes.',
        tryThis:
          'Start with a short delay time (0.05s) — the echo is so fast it sounds like the note is just "thickened." Now increase the time to 0.3s. You hear a distinct echo after each note. At 0.5s or longer, echoes are clearly separated in time. Watch the echo traces in the display spread apart.',
      },
      {
        name: 'Feedback',
        description:
          'How much of the echo is fed back into the delay to create additional repeats. At 0, you get a single echo. At higher values, the echo repeats many times, gradually fading. Above 0.9, the echoes barely fade and can build up dangerously loud.',
        tryThis:
          'Set feedback to 0 — just one echo. Now increase it to about 0.5 — you hear several fading repeats. Push it to 0.8 or 0.9 — the echoes go on for a long time, building a wash of sound. Watch the display — you can see the echo traces repeating, each one dimmer than the last. Be careful above 0.9, as the echoes can build up.',
      },
      {
        name: 'Mix',
        description:
          'Blends between the original dry signal (0) and the delayed wet signal (1). At 0.5, you hear both equally. Start around 0.3 for a natural echo effect.',
        tryThis:
          'Set mix to 0 — no echo at all, just the dry signal. Bring it to 0.3 — the echoes sit behind the original sound naturally. At 0.5, the echoes are as loud as the original. At 1.0, you hear only the echoes, not the original — a surreal effect.',
      },
    ],
    ports: [
      {
        name: 'IN',
        type: 'audio',
        direction: 'in',
        connectTo: 'VCA OUT, Filter OUT, Oscillator OUT, or any audio signal you want to add echoes to',
      },
      {
        name: 'OUT',
        type: 'audio',
        direction: 'out',
        connectTo: 'Output IN, Reverb IN (delay into reverb is a classic combo), Mixer channel, or another Delay for complex multi-tap effects',
      },
    ],
    vizGuide:
      'The display shows cascading echo traces — each repetition of the echo appears as a waveform that is progressively dimmer than the one before it. You can see the echoes trailing off into silence. The spacing between the traces shows your delay time, and the number of visible traces shows your feedback amount.',
    tryThis:
      'Create a rhythmic echo: connect a Sequencer-driven patch through the Delay before the Output. Set delay time to match the tempo (for 120 BPM, try 0.5s for half-note echoes, or 0.25s for quarter-note echoes). Set feedback around 0.4 and mix around 0.3. The echoes will weave in between the notes, creating a much more complex rhythmic pattern from a simple sequence.',
  },

  reverb: {
    tooltip:
      'Reverb simulates the sound of a space — a small room, a concert hall, or a cathedral. It adds the natural reflections and ambience that make sounds feel like they exist in a real place instead of a vacuum.',
    whatItDoes:
      'Reverb (short for reverberation) simulates what happens when sound bounces off the walls, floor, and ceiling of a room. In real life, every sound you hear is followed by thousands of tiny echoes bouncing around the space — your brain uses these to determine how large the room is. The decay control sets how long the reverb tail lasts — short decay sounds like a small room, long decay sounds like a cathedral. The damping control determines how quickly high frequencies fade in the reverb tail — high damping sounds warm and natural (like a carpeted room), low damping sounds bright and metallic (like a tiled bathroom). The mix control blends between the dry original and the wet reverb.',
    signalFlow: 'Audio In -> Thousands of tiny reflections generated -> Decay and damping shape the tail -> Dry/Wet mixed -> Audio Out',
    controls: [
      {
        name: 'Decay',
        description:
          'How long the reverb tail lasts, in seconds. Short decay (0.5-2s) sounds like a small room. Medium decay (3-6s) sounds like a concert hall. Long decay (8-15s) sounds like a vast cathedral or cave.',
        tryThis:
          'Set decay to 0.5s — tight and intimate, like playing in a closet. Now increase to 3s — a nice hall sound. Push it to 10s or more — the reverb becomes a massive, immersive wash. Play short, staccato notes and listen to how the reverb tail fills the space between them.',
      },
      {
        name: 'Mix',
        description:
          'Blends between the original dry signal (0) and the reverb wet signal (1). A little reverb (0.2-0.3) adds natural space. Heavy reverb (0.6+) creates an ambient, dreamy effect.',
        tryThis:
          'With decay set to a medium value, slowly increase the mix from 0 to 1. At low values the reverb is subtle — the sound just feels more "in a room." Around 0.5 the reverb becomes very present. At 1.0 you hear only the reverb with none of the original clarity — useful for ambient soundscapes.',
      },
      {
        name: 'Damping',
        description:
          'Controls how quickly high frequencies fade in the reverb tail. At 0 (no damping), the tail is bright and shimmery. At 1 (full damping), high frequencies die away quickly, leaving a dark, warm tail.',
        tryThis:
          'Set a long decay and moderate mix, then sweep the damping. Low damping makes the reverb bright and metallic, like a tile bathroom. High damping makes it dark and warm, like a wood-paneled concert hall. Listen to the difference in the character of the tail.',
      },
    ],
    ports: [
      {
        name: 'IN',
        type: 'audio',
        direction: 'in',
        connectTo: 'VCA OUT, Delay OUT (delay into reverb is a classic combination), Mixer OUT, or any audio signal that needs space and ambience',
      },
      {
        name: 'OUT',
        type: 'audio',
        direction: 'out',
        connectTo: 'Output IN, or Mixer channel to blend the reverbed signal with other dry signals',
      },
    ],
    vizGuide:
      'The display shows an impulse spike (representing the original sound) followed by a dissolving tail of particles that represents the reverb decay. The length of the particle trail shows the decay time. The particles fade and thin out over time, just like the reverb sound fades. High damping makes the upper particles fade faster.',
    tryThis:
      'Build an ambient pad: use a Sequencer with long gate length playing through an Oscillator, Envelope, and VCA. Send the VCA output to a Delay first (time 0.4s, feedback 0.5, mix 0.4), then into a Reverb (decay 8s, mix 0.5, damping 0.6), then to Output. The combination of delay and reverb creates a lush, evolving soundscape from even a simple sequence.',
  },

  distortion: {
    tooltip:
      'Distortion adds grit, warmth, or aggression by clipping the sound wave — intentionally pushing it past its limits. It can range from subtle tube-like warmth to harsh, crunchy destruction.',
    whatItDoes:
      'Distortion works by amplifying the signal until it "clips" — the peaks of the wave are cut off or folded back because they exceed the maximum level. This changes the shape of the wave and adds new harmonics (higher frequencies that were not in the original sound). Soft clipping rounds off the peaks gently, adding warmth and subtle harmonics, similar to a tube amplifier. Hard clipping chops the peaks flat, creating a harsher, more aggressive sound, like a guitar distortion pedal. Wave folding takes the peaks and folds them back down, creating complex, metallic harmonics. Even a clean sine wave becomes rich and complex after distortion.',
    signalFlow: 'Audio In -> Signal amplified by drive amount -> Peaks clipped/folded by mode -> Dry/Wet mixed -> Audio Out',
    controls: [
      {
        name: 'Drive',
        description:
          'How much the signal is amplified before clipping. Low drive adds subtle warmth. High drive creates heavy distortion. Think of it as how hard you are "pushing" the signal into the clipping stage.',
        tryThis:
          'Start with drive at 0 — no distortion, clean signal. Slowly increase it. Listen to how the sound gets progressively grittier. Watch the transfer curve display at the top — it bends more as drive increases, showing how the signal is being reshaped. Watch the before/after waveforms at the bottom to see the wave shape change.',
      },
      {
        name: 'Mode',
        description:
          'Soft clipping rounds the peaks (warm, tube-like). Hard clipping flattens them (aggressive, buzzy). Fold wraps them back down (metallic, complex).',
        tryThis:
          'Set drive to medium and switch between modes. Soft sounds warm, like turning up a guitar amp. Hard sounds crunchy and aggressive. Fold sounds weird and metallic — try it with a sine wave and high drive for really alien-sounding tones. The transfer curve changes shape for each mode.',
      },
      {
        name: 'Mix',
        description:
          'Blends between the clean original (0) and the distorted version (1). Low mix values add subtle harmonics while keeping the clean tone intact.',
        tryThis:
          'With moderate drive, sweep the mix from 0 to 1. At low values, you get a warm, slightly enhanced version of your sound. At high values, the distortion takes over completely. A mix of 0.3-0.5 often sounds the most musical — you get grit on top of a clean foundation.',
      },
    ],
    ports: [
      {
        name: 'IN',
        type: 'audio',
        direction: 'in',
        connectTo: 'Oscillator OUT for direct distortion of the raw wave, Filter OUT for distorted bass sounds, or any audio source',
      },
      {
        name: 'OUT',
        type: 'audio',
        direction: 'out',
        connectTo: 'Filter IN (distortion into filter is a classic combo — distort first, then tame the harsh highs), Output IN, or Mixer channel',
      },
    ],
    vizGuide:
      'The top panel shows the transfer curve — a graph showing how input levels (horizontal) map to output levels (vertical). A straight diagonal line means no distortion. Curves and bends show where clipping happens. The bottom panel shows a before-and-after waveform comparison — you can see the original wave shape and how distortion has reshaped it. Soft clipping rounds the tops, hard clipping flattens them, and fold makes them bounce back.',
    tryThis:
      'Try this taming technique: connect an Oscillator (sine wave) into Distortion (hard clip, high drive) into a Filter (lowpass, cutoff around 2000 Hz) into the Output. The distortion adds tons of harmonics, and the filter lets you control how bright or dark the result is. Sweep the filter cutoff to go from a warm, muffled growl to a bright, cutting buzz. This is the basis of many bass sounds in electronic music.',
  },

  samplehold: {
    tooltip:
      'Sample & Hold grabs the value of a signal at a specific moment (the trigger) and holds it until the next trigger. Feed it noise and a clock, and you get random staircase voltages — perfect for creating unpredictable, generative patterns.',
    whatItDoes:
      'The Sample & Hold module does exactly what its name says: when it receives a trigger pulse at its TRIGGER input, it "samples" (reads) the current value of whatever signal is connected to its SIGNAL input, and then "holds" (outputs) that value until the next trigger arrives. Between triggers, the output stays perfectly constant at the sampled value, creating a staircase-shaped output. The most classic use is to feed it noise as the signal and a steady clock as the trigger — each trigger grabs a random value from the noise, creating an unpredictable sequence of voltages. This is the heart of generative, evolving music — patches that surprise you.',
    signalFlow: 'Signal In monitored -> Trigger received -> Current signal value captured -> Held constant at output until next trigger',
    controls: [],
    ports: [
      {
        name: 'SIGNAL IN',
        type: 'cv',
        direction: 'in',
        connectTo: 'Noise OUT for random values (most common and classic use), LFO OUT for quantized-feeling stepped modulation, or any signal you want to sample',
      },
      {
        name: 'TRIGGER',
        type: 'gate',
        direction: 'in',
        connectTo: 'Sequencer GATE OUT to sample on each step, LFO OUT (square wave) for a steady clock, or Keyboard GATE OUT to sample on each key press',
      },
      {
        name: 'OUT',
        type: 'cv',
        direction: 'out',
        connectTo: 'Oscillator V/OCT for random melodies, Filter FREQ CV for random filter sweeps, or VCA CV for random volume changes',
      },
    ],
    vizGuide:
      'The display shows a staircase pattern — flat horizontal lines that jump to new levels on each trigger. This is the held output value over time. Behind the staircase, a dimmer line shows the original input signal for comparison, so you can see how the continuous input is being "sampled" into discrete steps.',
    tryThis:
      'Create a generative random melody: connect Noise OUT to Sample & Hold SIGNAL IN. Connect a Sequencer GATE OUT (or an LFO square wave) to the TRIGGER input. Send the Sample & Hold OUT to an Oscillator V/OCT. Each trigger grabs a random voltage from the noise, sending the Oscillator to a random pitch. Add an Envelope and VCA to shape each note. You now have a self-playing patch that never repeats the same melody twice.',
  },
};

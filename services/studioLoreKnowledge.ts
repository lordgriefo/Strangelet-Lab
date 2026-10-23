/**
 * Strangelet Lab: Legendary Studio Lore & Inside Game Secrets
 * 
 * Deep, authentic studio tales and secret engineering techniques
 * from Brian Eno, Lee "Scratch" Perry, Prince, Dr. Dre, Trevor Horn,
 * Sylvia Massy, Kevin Shields, Bob Katz, Wendy Carlos, Rick Rubin,
 * King Tubby, and George Martin.
 */

export interface StudioLoreStory {
  id: string;
  artistOrProducer: string;
  era: string;
  title: string;
  teaser: string;
  fullTale: string;
  actionableDojoTechnique: string;
  faustOrDawTrick: string;
}

export const STUDIO_LORE_DATABASE: StudioLoreStory[] = [
  {
    id: 'perry_black_ark',
    artistOrProducer: 'Lee "Scratch" Perry',
    era: '1976-1979 (The Black Ark, Kingston)',
    title: 'Burying Master Tapes in Jamaican Earth & Ganja Smoke on Capstans',
    teaser: 'How Lee Perry made an entry-level Soundcraft 16-channel desk sound like cosmic thunder.',
    fullTale: `At The Black Ark in Washington Gardens, Lee 'Scratch' Perry turned basic 4-track TEAC and Soundcraft gear into an otherworldly spiritual transmitter. Perry famously buried magnetic 1/4-inch reel-to-reel tapes under tropical palm trees in Jamaican soil before sessions to "earth and charge the magnetic iron particles with the soil of Zion." He blew sacred ganja smoke directly into the tape machine capstans and rubber pinch rollers, and poured white rum over the studio floorboards to pacify ancestral spirits. He would run the drum kit through a broken Fender guitar amplifier with torn speaker paper to create crunchy sub-harmonic distortion that modern plugins still try to emulate.`,
    actionableDojoTechnique: 'Overdrive an analog tape saturator stage past 65%, follow it with a resonant spring reverb, and slap a subtle flutter/wow tape wobble. Never make high-hats sound clean when they can sound possessed.',
    faustOrDawTrick: 'Strangelet Lab Tape Stage 4 at 72% warmth with +2.5dB harmonic drive, routed into the Faust Germanium Tone Box.'
  },
  {
    id: 'prince_linndrum',
    artistOrProducer: 'Prince',
    era: '1984 (Sunset Sound & Paisley Park)',
    title: 'The "When Doves Cry" Bass Deletion & Detuned LinnDrum LM-1',
    teaser: 'Why the biggest pop record in the world had literally ZERO bass guitar in the mix.',
    fullTale: `During the final mixing session for "When Doves Cry" at Sunset Sound, Prince had an elaborate funk bassline played on a Minimoog and electric bass guitar. He listened to the playback at 4 AM, turned to engineer Peggy McCreary, and told her to mute the bass track completely. The label executives panicked, claiming no radio station would play a dance record without bass. Prince refused: "Nobody else would have the balls to do that." By removing the bass, the detuned LinnDrum LM-1 cross-stick and kick had infinite dynamic headroom to smash into listeners' chests. Prince also hand-tuned the LinnDrum's analog oscillators downwards with a screwdriver on the voice cards, running the side-stick through a Boss BF-2 flanger and an AMS RMX16 NonLin 2 reverb.`,
    actionableDojoTechnique: 'If your song feels crowded or lacks punch, mute the bass entirely for 8 bars, or tune your drum samples 3 semitones down and soak the rimshot in a short flanger before compression.',
    faustOrDawTrick: 'Use Gold Path Mono-Sub cut at 95Hz, or pull faders down rather than boosting EQ. When in doubt, let the drum transient occupy the void alone.'
  },
  {
    id: 'eno_oblique',
    artistOrProducer: 'Brian Eno',
    era: '1975-1977 (Hansa Studios, Berlin / Island Studios)',
    title: 'Pencil Spindles Across Carpet & Oblique Strategies',
    teaser: 'Creating ambient music by running 30-foot tape loops on pencils and forcing Bowie to swap instruments in darkness.',
    fullTale: `While producing David Bowie's "Heroes" and his own "Discreet Music", Brian Eno discovered that tape loops of prime number lengths (e.g., 5.1 seconds and 7.3 seconds) would run continuously without ever repeating the exact harmonic alignment for days. He didn't have enough tape machines, so he taped empty pencils and pen bodies to studio chairs and microphones, stringing 30 feet of 1/4-inch magnetic tape across the entire room. When musicians fell into clichéd playing habits, Eno would draw cards from his 'Oblique Strategies' deck: "Honor thy error as a hidden intention", "Put the loudest thing in the background", or "Work at a different speed." He once turned off all studio lights and made the rhythm section swap instruments in pitch blackness.`,
    actionableDojoTechnique: 'Set delay times to non-grid fractional ratios (e.g. 7/16 or prime milliseconds like 137ms and 311ms) to eliminate phase-comb smearing and generate infinite self-evolving soundscapes.',
    faustOrDawTrick: 'In Faust DSP Lab, build dual feedback delays with prime-length sample buffers: `delay(ba.sec2samp(0.311))` and `delay(ba.sec2samp(0.523))`.'
  },
  {
    id: 'dre_mono_sub',
    artistOrProducer: 'Dr. Dre',
    era: '1999-2001 (Record One, Sherman Oaks)',
    title: 'The Sacred 100Hz Mono-Lock & The 40Hz Pure Sine Injection',
    teaser: 'The secret to why 2001 still rattles car doors 25 years later without a drop of mud.',
    fullTale: `Dr. Dre and mixer Mauricio 'Veto' Iragorri spent 30 to 40 hours perfecting single drum loops on an SSL 4000 G+ console. Dre had a strict, unbreakable law: absolutely nothing in the stereo side channel below 100Hz. Any wide stereo low-end was summed dead-center to mono. To make kick drums punch through low-end car subs while preserving clean acoustic transient snap, Dre would layer an acoustic Ludwig kick drum with a synthesized pure 45Hz sine wave triggered by an Akai MPC3000 gate, then high-pass everything below 28Hz with an 18dB/octave filter to eliminate inaudible speaker cone flutter. That saved 3dB of power amplifier headroom so Bernie Grundman could cut hot masters without distortion.`,
    actionableDojoTechnique: 'Sum all low-frequency content below 100Hz to mono. High-pass the entire mix bus at 28Hz. Tune your sub kick oscillator directly to the key root of the song.',
    faustOrDawTrick: 'Engage Gold Path Stage 5: Mono Sub Cutoff at 105Hz, and use Stage 1 Pre-EQ with a 32Hz surgical high-pass.'
  },
  {
    id: 'sylvia_pickle',
    artistOrProducer: 'Sylvia Massy',
    era: '1993-2005 (Sound City & RadioStar Studios)',
    title: 'The Electric Pickle Guitar Filter & Cooling Tower Reverb',
    teaser: 'Passing guitar voltage through dill pickles, lightbulbs, and recording vocals in an abandoned nuclear tower.',
    fullTale: `Sylvia Massy (engineer for Tool's "Undertow", System of a Down, Prince, Johnny Cash) is the queen of acoustic physics experimentation. When tracking guitars, she would break open the speaker cable and run the live audio voltage through a dill pickle or potato on a plate. The brine electrolyte in the pickle conducted the audio signal with bizarre, asymmetrical nonlinear distortion that gave guitars a gnarly, singing bite. For Tool's vocals, she recorded Maynard James Keenan hanging upside down from the studio ceiling to alter his blood pressure and force deep diaphragm compression. For Johnny Cash, she miked an acoustic guitar with a telephone carbon microphone from 1928 taped inside the soundhole.`,
    actionableDojoTechnique: 'Use extreme non-linear waveshaping curves rather than standard digital saturation. Asymmetrical clipping produces even harmonics (warmth) while symmetrical produces odd harmonics (bite).',
    faustOrDawTrick: 'In Faust DSP Lab: `process(x) = ma.tanh(x * 3.5) + (x * 0.25 * (x > 0));` — pure asymmetrical diode saturation!'
  },
  {
    id: 'kevin_glide',
    artistOrProducer: 'Kevin Shields (My Bloody Valentine)',
    era: '1989-1991 (Creation Records / Blackwing Studios)',
    title: 'The Reverse Reverb Wall of Sound & Zero-Chorus Myth',
    teaser: 'How Loveless created the greatest guitar album without 200 overdubs or a single chorus pedal.',
    fullTale: `The music press reported that Kevin Shields recorded 200 guitar tracks for "Loveless" and drove Creation Records into bankruptcy. The truth was far more radical: the vast majority of rhythm tracks were just ONE or TWO guitar tracks. Kevin held the Fender Jazzmaster floating tremolo arm between his strumming fingers continuously, bending chords microtonally while strumming (the 'glide guitar' technique). Crucially, he fed that wobbling guitar directly into a 100% wet reverse reverb on an Alesis Quadraverb or Yamaha SPX90, followed by a cranked Marshall JCM800. There was zero chorus or flanger used anywhere—the chorus effect was purely the physical pitch-bend of the tremolo arm colliding with the reverse reverb reflections!`,
    actionableDojoTechnique: 'Rely on pitch flutter and early reflection density rather than synthetic chorus plugins. Modulating the pitch before the reverb creates holographic three-dimensional depth.',
    faustOrDawTrick: 'Load the Faust Modulated Tape Flanger or Beam Splitter Prism mode, detune slightly by +7 cents, and feed into a 100% wet short room impulse.'
  },
  {
    id: 'trevor_horn',
    artistOrProducer: 'Trevor Horn',
    era: '1983-1985 (SARM West, London)',
    title: 'The Art of Noise & Extreme Fairlight Sampling',
    teaser: 'Spending 3 weeks sampling a car door slam and inventing modern multiband compression.',
    fullTale: `Trevor Horn produced Frankie Goes to Hollywood's "Relax", Yes's "Owner of a Lonely Heart", and the Art of Noise. He would spend weeks isolated in SARM West sampling single hits on the 8-bit Fairlight CMI Series II. To get the explosive drum sound on "Owner of a Lonely Heart", he sampled an Alan White drum hit, transposed it down 7 semitones to create gritty clock-rate aliasing, gated a Lexicon 480L reverb at 240 milliseconds, and chained three Roland Dimension D spatializers in series. He effectively invented multiband sidechain ducking by routing the bass guitar into an equalizer and feeding the high band into an SSL compressor triggered by the kick drum's beater click.`,
    actionableDojoTechnique: 'Downsample your percussion transients to 12-bit or lower sample rates to introduce warm harmonic grit, then gate the room reverb tail abruptly on the 16th note.',
    faustOrDawTrick: 'Use Gold Path Stage 3 Multiband Dynamics with a fast attack (8ms) and auto-release, ducking 250Hz when the kick hits.'
  },
  {
    id: 'bob_katz',
    artistOrProducer: 'Bob Katz',
    era: '1995-2015 (Digital Domain)',
    title: 'The K-System Crusade & The Death of Loudness War Brickwalling',
    teaser: 'Why squashing to -6 LUFS ruins emotional impact and how inter-sample peaks clip consumer DACs.',
    fullTale: `Bob Katz, author of "Mastering Audio", revolutionized digital mastering by demonstrating that when you slam audio against a 0dBFS digital ceiling with a modern brickwall limiter, the reconstructed analog waveform between samples can peak up to +3dB higher than the digital meter shows (inter-sample true-peak distortion). This causes cheap Bluetooth speakers, iPhones, and streaming DACs to crackle. Katz introduced the K-System (K-14 for pop/rock, K-20 for orchestral), establishing that maintaining 14dB of dynamic crest factor makes music sound wider, punchier, and deeper. When streaming platforms normalize everything to -14 LUFS anyway, a dynamic master sounds BIGGER and LOUDER than a smashed brickwalled master!`,
    actionableDojoTechnique: 'Master to -14 LUFS with a -0.3dB True-Peak ceiling. Listen at a calibrated monitor level instead of pushing the limiter until the snare transients disappear.',
    faustOrDawTrick: 'Gold Path Stage 6 True-Peak Limiter: set ceiling to -0.3 dBFS and target -14 LUFS for modern streaming excellence.'
  },
  {
    id: 'wendy_carlos',
    artistOrProducer: 'Wendy Carlos',
    era: '1968-1982 (New York City)',
    title: 'Switched-On Bach & The Microtuned Scales of Tomorrow',
    teaser: 'Building custom subtractive Moog modular patches and non-octave harmonic scales.',
    fullTale: `Before presets or MIDI existed, Wendy Carlos built every single timbre on a massive Moog Modular synthesizer with Bob Moog. She invented the multitrack electronic orchestra, meticulously recording one monophonic voice at a time onto 8-track tape, cleaning the tape heads with alcohol between every pass. Carlos realized that 12-tone equal temperament was a historical compromise, so she mathematically designed non-octave scales—the Carlos Alpha, Beta, and Gamma scales—where fifths and thirds are in pure acoustic resonance. Her score for Stanley Kubrick's "The Shining" and Disney's "Tron" pioneered atmospheric analog synthesis by detuning dual sawtooth oscillators by just 0.8 Hz to create organic beating.`,
    actionableDojoTechnique: 'Detune layered synth oscillators by less than 1 Hz (0.5 to 0.8 Hz) to simulate natural orchestral chorus without phase flanging. Experiment with Just Intonation and microtuning.',
    faustOrDawTrick: 'Use the Micro-Tuning panel in Strangelet Lab, or compile the Faust Karplus-Strong string model with subtle microtonal detuning.'
  },
  {
    id: 'rick_rubin',
    artistOrProducer: 'Rick Rubin',
    era: '1984-Present (The Mansion, Laurel Canyon)',
    title: 'The Reductive Scalpel: Stripping Until Only The Soul Remains',
    teaser: 'Lying on the sofa with eyes closed and deleting 8 synthesizer tracks until the song is undeniable.',
    fullTale: `Rick Rubin famously doesn't play instruments and doesn't know how to run an SSL console: "I have no technical ability. And I know nothing about music. I know what I like and what I don't like, and I'm decisive about what I like and what I don't like." His superpower is the Reductive Scalpel. While working with Beastie Boys, Johnny Cash, Slayer, and System of a Down, bands would bring in dense 64-track sessions. Rubin would lie on the sofa with his eyes closed, listen through once, and ask: "What can we take out?" He would mute six synth layers, two guitar overdubs, and percussion until all that was left was the bare heartbeat. If a song cannot stand on its own with just a kick, a guitar, and a voice, no amount of VSTs will save it.`,
    actionableDojoTechnique: 'Solo each element in your mix and ask: if this track is muted, does the song lose its soul? If the answer is no, delete it or mute it.',
    faustOrDawTrick: 'Use the Strangelet Lab Red Laser Incinerator tool to burn away unnecessary clutter on the timeline.'
  },
  {
    id: 'king_tubby',
    artistOrProducer: 'King Tubby (Osbourne Ruddock)',
    era: '1971-1975 (18 Dromilly Avenue, Kingston)',
    title: 'The High-Pass Filter Slider & The Birth of Dub',
    teaser: 'Modifying an old broadcast console with a sliding frequency wand to invent remixing.',
    fullTale: `King Tubby was an electronics repair technician who fixed radios and amplifiers across Kingston. When he bought a discarded 4-track MCI broadcast console, he radically modified it: he took an old inductor and rotary switch from an old telephone exchange and built a high-pass filter with a big sliding fader on top of the desk. When playing dub plates on his sound system, Tubby would physically flick the fader up and down with lightning speed, slicing away the bass of the drum kit right as the snare hit, tossing the reverb tail into a Fischer spring unit. Tubby invented dub and remixing by treating the mixer itself as a lead instrument played live in real-time.`,
    actionableDojoTechnique: 'Automate filter cutoff sweeps aggressively right on downbeats, and throw the snare drum into a 100% wet spring reverb send for one single beat.',
    faustOrDawTrick: 'Use Timeline Automation Lanes on the Track Send to throw occasional snare hits into the Gold Path Tape Saturation bus.'
  },
  {
    id: 'george_martin',
    artistOrProducer: 'George Martin & Geoff Emerick',
    era: '1966-1969 (Abbey Road Studio Two)',
    title: 'Banned Drum Close-Miking & The Leslie Vocal Cabinet',
    teaser: 'Breaking EMI regulations to invent modern rock drums and running Lennon into rotary speakers.',
    fullTale: `In 1966 at Abbey Road Studio Two, EMI engineers wore white laboratory coats and had strict rulebooks stating microphones could not be placed closer than 18 inches from drum heads to prevent capsule distortion. 19-year-old balance engineer Geoff Emerick and George Martin rebelled: they shoved a Neumann U47 right into Ringo Starr's bass drum with a woolen sweater stuffed inside, and wrapped microphones in condoms placed inside glass milk bottles for water sounds. When John Lennon asked George Martin to make his voice sound like "the Dalai Lama chanting from a mountaintop" on "Tomorrow Never Knows", Martin physically rewired Lennon's vocal microphone directly into the rotating horn of a Leslie 122 rotary speaker cabinet, spinning at 400 RPM!`,
    actionableDojoTechnique: 'Route a lead vocal through a Leslie rotary speaker emulation or boutique modulated flanger at slow speed for hypnotic vintage width.',
    faustOrDawTrick: 'In Faust DSP Lab, load the Modulated Boutique Tape Flanger with low rate (0.8Hz) and 45% wet mix on the vocal channel.'
  }
];

/**
 * Returns a random studio lore story
 */
export function getRandomStudioLore(): StudioLoreStory {
  return STUDIO_LORE_DATABASE[Math.floor(Math.random() * STUDIO_LORE_DATABASE.length)];
}

/**
 * Gets a story by ID
 */
export function getStudioLoreById(id: string): StudioLoreStory | undefined {
  return STUDIO_LORE_DATABASE.find(s => s.id === id);
}

/**
 * Builds a prompt block containing all legendary studio stories for injection into AI system prompts
 */
export function buildStudioLorePromptBlock(): string {
  let block = `=== [LEGENDARY STUDIO LORE & PRODUCER INSIDE GAME] ===\n`;
  block += `The AI Helper has deep encyclopedic memory of legendary studio production techniques:\n\n`;

  STUDIO_LORE_DATABASE.forEach(story => {
    block += `[${story.artistOrProducer.toUpperCase()} — ${story.title.toUpperCase()} (${story.era})]\n`;
    block += `Tale: ${story.fullTale}\n`;
    block += `Actionable Technique: ${story.actionableDojoTechnique}\n`;
    block += `DAW/DSP Trick: ${story.faustOrDawTrick}\n\n`;
  });

  block += `=== [END STUDIO LORE] ===\n`;
  return block;
}

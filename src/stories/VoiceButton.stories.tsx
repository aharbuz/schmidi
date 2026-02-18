import type { Meta, StoryObj } from '@storybook/react';
import { VoiceButton } from '../renderer/components/VoiceButton';
import type { VoiceState } from '../shared/types';

const defaultState: VoiceState = {
  isActive: false,
  stage: 'idle',
  frequency: 261.63,
  detune: 0,
};

const meta: Meta<typeof VoiceButton> = {
  title: 'Controls/VoiceButton',
  component: VoiceButton,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    voiceIndex: { control: { type: 'number', min: 0, max: 7 } },
    voiceState: { control: 'object' },
    keyLabel: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof VoiceButton>;

export const Idle: Story = {
  args: {
    voiceIndex: 0,
    voiceState: { ...defaultState },
    keyLabel: 'a',
    onTrigger: () => console.log('trigger'),
    onRelease: () => console.log('release'),
  },
};

export const Attack: Story = {
  args: {
    voiceIndex: 1,
    voiceState: { ...defaultState, isActive: true, stage: 'attack' },
    keyLabel: 's',
    onTrigger: () => console.log('trigger'),
    onRelease: () => console.log('release'),
  },
};

export const Sustain: Story = {
  args: {
    voiceIndex: 2,
    voiceState: { ...defaultState, isActive: true, stage: 'sustain' },
    keyLabel: 'd',
    onTrigger: () => console.log('trigger'),
    onRelease: () => console.log('release'),
  },
};

export const Release: Story = {
  args: {
    voiceIndex: 3,
    voiceState: { ...defaultState, isActive: false, stage: 'release' },
    keyLabel: 'f',
    onTrigger: () => console.log('trigger'),
    onRelease: () => console.log('release'),
  },
};

export const AllStages: Story = {
  render: () => (
    <div className="flex gap-3">
      {(['idle', 'attack', 'sustain', 'release'] as const).map((stage, i) => (
        <VoiceButton
          key={stage}
          voiceIndex={i}
          voiceState={{ ...defaultState, isActive: stage !== 'idle', stage }}
          keyLabel={['a', 's', 'd', 'f'][i]}
          onTrigger={() => console.log(`trigger ${i}`)}
          onRelease={() => console.log(`release ${i}`)}
        />
      ))}
    </div>
  ),
};

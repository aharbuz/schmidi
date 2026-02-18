import type { Meta, StoryObj } from '@storybook/react';
import { WaveformSelector } from '../renderer/components/WaveformSelector';

const meta: Meta<typeof WaveformSelector> = {
  title: 'Controls/WaveformSelector',
  component: WaveformSelector,
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof WaveformSelector>;

/** Default view with sine waveform selected */
export const Default: Story = {};

/** WaveformSelector is store-connected; click buttons to switch waveforms */
export const Interactive: Story = {
  name: 'Interactive (click waveform icons)',
};

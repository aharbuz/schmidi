import type { Meta, StoryObj } from '@storybook/react';
import { VolumeControl } from '../renderer/components/VolumeControl';

const meta: Meta<typeof VolumeControl> = {
  title: 'Controls/VolumeControl',
  component: VolumeControl,
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof VolumeControl>;

/** Default view with volume at 70% */
export const Default: Story = {};

/** VolumeControl is store-connected; drag slider to adjust master volume */
export const Interactive: Story = {
  name: 'Interactive (drag slider)',
};

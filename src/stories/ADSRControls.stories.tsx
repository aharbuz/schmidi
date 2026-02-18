import type { Meta, StoryObj } from '@storybook/react';
import { ADSRControls } from '../renderer/components/ADSRControls';

const meta: Meta<typeof ADSRControls> = {
  title: 'Controls/ADSRControls',
  component: ADSRControls,
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof ADSRControls>;

/** Default view with Pad (Drift) preset loaded */
export const Default: Story = {};

/** ADSRControls are store-connected; interact to cycle presets */
export const Interactive: Story = {
  name: 'Interactive (use preset dropdown)',
};

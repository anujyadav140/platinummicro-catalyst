/**
 * "Industries we serve" — six audience cards on the homepage.
 * Edit copy here, NOT in the components — this is the source of truth.
 */

export interface PmSegment {
  /** Stable identifier (also analytics key, even though no per-segment route exists) */
  key: string;
  /** Title-case display name */
  label: string;
  /** Short one-liner for hover/expanded states (no longer rendered in the compact card by default) */
  description: string;
  /** Lucide icon name (resolved by the icon component) */
  icon: string;
}

export const PM_SEGMENTS: PmSegment[] = [
  {
    key: 'public-sector',
    label: 'Public Sector',
    description: 'GSA-aligned procurement and cooperative contract vehicles.',
    icon: 'Landmark',
  },
  {
    key: 'education',
    label: 'Education',
    description: 'E-rate aware procurement, classroom kitting, lifecycle takeback.',
    icon: 'GraduationCap',
  },
  {
    key: 'enterprise',
    label: 'Enterprise',
    description: 'Dedicated account managers and global drop-ship.',
    icon: 'Globe2',
  },
  {
    key: 'ai-research',
    label: 'AI & Research',
    description: 'GPU clusters, HPC nodes, and storage for training and inference.',
    icon: 'Cpu',
  },
  {
    key: 'healthcare',
    label: 'Healthcare',
    description: 'HIPAA-aware sourcing and asset tagging for clinical sites.',
    icon: 'HeartPulse',
  },
  {
    key: 'msp',
    label: 'Managed Service Providers',
    description: 'Channel pricing, white-label logistics, and BOM upload for MSP rollouts.',
    icon: 'ServerCog',
  },
];

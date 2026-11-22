import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { JOB_TYPE_ICON, JOB_TYPES, jobTypeIcon } from './job-type';

describe('Job type icons (BUG-16)', () => {
  it('gives each of the 6 job types its own icon, from the icon font', () => {
    expect(JOB_TYPES).toHaveLength(6);
    const icons = JOB_TYPES.map((type) => JOB_TYPE_ICON[type]);
    expect(new Set(icons).size).toBe(6);
    for (const name of icons) expect(MaterialCommunityIcons.glyphMap).toHaveProperty(name);
  });

  it('falls back to Other for a type it does not know', () => {
    expect(jobTypeIcon('REPAIR')).toBe('wrench-outline');
    expect(jobTypeIcon('SOMETHING_NEW')).toBe(JOB_TYPE_ICON.OTHER);
  });
});

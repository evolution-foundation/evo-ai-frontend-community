import { useState } from 'react';
import type { DealContact } from '@/types/analytics';
import { getContactAvatarStyle, getContactInitials } from '@/utils/chat/avatarHelpers';
import { contactAvatarUrl } from './dealFormat';

export function HeaderAvatar({ contact, name }: { contact?: Pick<DealContact, 'avatar_url' | 'thumbnail' | 'name'> | null; name?: string | null }) {
  const [failed, setFailed] = useState<string>();
  const image = contactAvatarUrl(contact);
  const label = name ?? contact?.name;
  if (image && failed !== image) return <img src={image} alt="" className="deal-modal-avatar" onError={() => setFailed(image)} />;
  const hue = getContactAvatarStyle(label);
  return (
    <span className={`deal-modal-avatar${hue ? ' av-hue' : ''}`} style={hue} aria-hidden="true">
      {getContactInitials(label) || '?'}
    </span>
  );
}

import { useState } from 'react';
import Modal from './Modal';
import Button from './Button';
import Spinner from './Spinner';
import { Label, Input } from './Field';
import { useAddMemberMutation } from '../services/api';

export default function AddMemberModal({
  open,
  onClose,
  projectId,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
}) {
  const [email, setEmail] = useState('');
  const [addMember, { isLoading }] = useAddMemberMutation();
  const [error, setError] = useState('');

  const submit = async () => {
    if (!email.trim()) return setError('Enter a teammate email');
    try {
      await addMember({ projectId, email: email.trim() }).unwrap();
      setEmail('');
      setError('');
      onClose();
    } catch (err) {
      const status = (err as { status?: number }).status;
      setError(status === 404 ? 'No user found with that email' : 'Could not add member');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add a member">
      <div className="space-y-4">
        <div>
          <Label>Member email</Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teammate@example.com"
            autoFocus
          />
          <p className="mt-1 text-xs text-muted">They need an account already. Owners can add members.</p>
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={isLoading}>
            {isLoading && <Spinner />}
            Add member
          </Button>
        </div>
      </div>
    </Modal>
  );
}

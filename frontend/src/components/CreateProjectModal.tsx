import { useState } from 'react';
import Modal from './Modal';
import Button from './Button';
import Spinner from './Spinner';
import { Label, Input, Textarea } from './Field';
import { useCreateProjectMutation } from '../services/api';

export default function CreateProjectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [createProject, { isLoading }] = useCreateProjectMutation();
  const [error, setError] = useState('');

  const submit = async () => {
    if (!name.trim()) return setError('Give the project a name');
    try {
      await createProject({ name: name.trim(), description: description.trim() || undefined }).unwrap();
      setName('');
      setDescription('');
      setError('');
      onClose();
    } catch {
      setError('Could not create the project. Try again.');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="New project">
      <div className="space-y-4">
        <div>
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Website redesign" autoFocus />
        </div>
        <div>
          <Label>Description</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this project about?"
            rows={3}
          />
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={isLoading}>
            {isLoading && <Spinner />}
            Create project
          </Button>
        </div>
      </div>
    </Modal>
  );
}

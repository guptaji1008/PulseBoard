import { useState } from 'react';
import Modal from './Modal';
import Button from './Button';
import Spinner from './Spinner';
import { Label, Input, Textarea, Select } from './Field';
import { PRIORITIES, PRIORITY_META } from '../lib/ui';
import type { Priority, Member } from '../types';
import { useCreateTaskMutation } from '../services/api';

export default function CreateTaskModal({
  open,
  onClose,
  projectId,
  members,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
  members: Member[];
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('MEDIUM');
  const [assigneeId, setAssigneeId] = useState('');
  const [createTask, { isLoading }] = useCreateTaskMutation();
  const [error, setError] = useState('');

  const submit = async () => {
    if (!title.trim()) return setError('Give the task a title');
    try {
      await createTask({
        projectId,
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        assigneeId: assigneeId || undefined,
      }).unwrap();
      setTitle('');
      setDescription('');
      setPriority('MEDIUM');
      setAssigneeId('');
      setError('');
      onClose();
    } catch {
      setError('Could not create the task. Try again.');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="New task">
      <div className="space-y-4">
        <div>
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Design the login page" autoFocus />
        </div>
        <div>
          <Label>Description</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Optional details" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Priority</Label>
            <Select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_META[p].label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Assignee</Label>
            <Select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.user.id} value={m.user.id}>
                  {m.user.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={isLoading}>
            {isLoading && <Spinner />}
            Create task
          </Button>
        </div>
      </div>
    </Modal>
  );
}

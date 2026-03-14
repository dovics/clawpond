'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Trash2, AlertTriangle } from 'lucide-react';

interface DeleteInstanceDialogProps {
  isOpen: boolean;
  instanceName: string;
  onClose: () => void;
  onConfirm: (deleteWorkspace: boolean) => Promise<void>;
}

type ConfirmStep = 'delete' | 'workspace';

export function DeleteInstanceDialog({
  isOpen,
  instanceName,
  onClose,
  onConfirm,
}: DeleteInstanceDialogProps) {
  const [step, setStep] = useState<ConfirmStep>('delete');
  const [deleteWorkspace, setDeleteWorkspace] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleContinue = async () => {
    if (step === 'delete') {
      setStep('workspace');
    } else {
      setIsDeleting(true);
      try {
        await onConfirm(deleteWorkspace);
        handleClose();
      } catch (error) {
        setIsDeleting(false);
      }
    }
  };

  const handleClose = () => {
    setStep('delete');
    setDeleteWorkspace(true);
    setIsDeleting(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            {step === 'delete' ? (
              <>
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Delete Instance
              </>
            ) : (
              <>
                <Trash2 className="h-5 w-5 text-red-500" />
                Delete Workspace?
              </>
            )}
          </DialogTitle>
          {step === 'delete' ? (
            <DialogDescription className="text-gray-400">
              Are you sure you want to delete the instance <span className="text-white font-semibold">"{instanceName}"</span>?
            </DialogDescription>
          ) : (
            <DialogDescription className="text-gray-400">
              Instance <span className="text-white font-semibold">"{instanceName}"</span> will be deleted.
              Do you also want to delete the workspace folder?
            </DialogDescription>
          )}
        </DialogHeader>

        {step === 'delete' ? (
          <>
            <div className="py-4">
              <div className="bg-red-900/20 border border-red-900/50 rounded-lg p-4">
                <p className="text-sm text-red-400 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>
                    This action will stop and remove the container. You'll be asked about workspace deletion next.
                  </span>
                </p>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="py-4 space-y-3">
              <div className="space-y-2">
                <Label className="text-white text-sm">Workspace Deletion Option</Label>
                <div className="space-y-2">
                  <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${deleteWorkspace ? 'border-primary bg-primary/10' : 'border-gray-600 hover:bg-gray-800'}`}>
                    <input
                      type="radio"
                      name="workspace"
                      checked={deleteWorkspace}
                      onChange={() => setDeleteWorkspace(true)}
                      className="accent-red-500"
                    />
                    <div className="flex-1">
                      <div className="text-white font-medium">Delete workspace folder</div>
                      <div className="text-xs text-gray-400 mt-1">
                        Remove all instance data and configuration files
                      </div>
                    </div>
                  </label>
                  <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${!deleteWorkspace ? 'border-primary bg-primary/10' : 'border-gray-600 hover:bg-gray-800'}`}>
                    <input
                      type="radio"
                      name="workspace"
                      checked={!deleteWorkspace}
                      onChange={() => setDeleteWorkspace(false)}
                      className="accent-red-500"
                    />
                    <div className="flex-1">
                      <div className="text-white font-medium">Keep workspace folder</div>
                      <div className="text-xs text-gray-400 mt-1">
                        Preserve data for future use or manual cleanup
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            className="text-gray-300 border-gray-600 hover:bg-gray-800"
            disabled={isDeleting}
          >
            {step === 'workspace' ? 'Back' : 'Cancel'}
          </Button>
          <Button
            onClick={handleContinue}
            disabled={isDeleting}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            {isDeleting ? (
              <>
                Deleting...
              </>
            ) : step === 'delete' ? (
              'Continue'
            ) : (
              'Confirm Delete'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

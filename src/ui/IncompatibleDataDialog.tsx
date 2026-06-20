import { clearAllLocalData } from '@/data/db';
import { useUiStore } from '@/state/ui-store';
import { Button } from '@/ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/components/ui/dialog';

export function IncompatibleDataDialog() {
  const open = useUiStore((s) => s.incompatibleDataDialogOpen);
  const setOpen = useUiStore((s) => s.setIncompatibleDataDialogOpen);

  const handleClear = async () => {
    await clearAllLocalData();
    setOpen(false);
  };

  const handleDismiss = () => {
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="max-w-md"
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Incompatible local data</DialogTitle>
          <DialogDescription>
            RefineIt was updated and your saved workflows are not compatible with this version.
            Clear all local data to continue, or dismiss to start with an empty workspace.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleDismiss}>
            Dismiss
          </Button>
          <Button onClick={() => void handleClear()}>Clear all local data</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

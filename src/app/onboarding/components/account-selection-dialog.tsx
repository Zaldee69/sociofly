import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  FacebookIcon,
  InstagramIcon,
} from "@/components/icons/social-media-icons";
import { Check } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface AccountSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: any[];
  onSelectAccount: (account: any) => void;
}

export const AccountSelectionDialog: React.FC<AccountSelectionDialogProps> = ({
  isOpen,
  onClose,
  accounts = [],
  onSelectAccount,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tempSelectedAccount, setTempSelectedAccount] = useState<any>(null);

  const handleItemClick = (account: any) => {
    const accountId = account.profileId || account.id;
    setSelectedId(accountId);
    setTempSelectedAccount(account);
  };

  const handleSubmit = () => {
    if (tempSelectedAccount) {
      onSelectAccount(tempSelectedAccount);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pilih Akun</DialogTitle>
          <DialogDescription>
            Pilih salah satu akun yang ingin Anda gunakan
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-4">
          {accounts.map((account) => {
            const accountId = account.profileId || account.id;
            const isSelected = selectedId === accountId;

            return (
              <Button
                key={accountId}
                variant="outline"
                className="w-full justify-start p-3 h-auto"
                onClick={() => handleItemClick(account)}
              >
                <div className="h-10 w-10 rounded-md flex items-center justify-center bg-gray-100 mr-3">
                  <Avatar>
                    <AvatarImage src={account.profilePicture} />
                    <AvatarFallback>{account.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                </div>
                <div className="text-left flex-1">
                  <p className="font-medium">{account.name}</p>
                  {account.username && (
                    <p className="text-xs text-gray-500">@{account.username}</p>
                  )}
                </div>
                <div className="h-6 w-6 rounded-full flex items-center justify-center border border-gray-200">
                  <Check
                    className={`h-4 w-4 text-primary ${isSelected ? "opacity-100" : "opacity-0"}`}
                  />
                </div>
              </Button>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="mr-2">
            Batal
          </Button>
          <Button onClick={handleSubmit} disabled={!selectedId}>
            Pilih Akun
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

'use client';

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import { Server } from '@/types/server';
import { serversApi } from '@/lib/api/servers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

const COUNTRIES = [
  'US', 'CN', 'HK', 'SG', 'JP', 'KR', 'TW', 'DE', 'GB', 'FR', 'NL', 'IN', 'BD', 'AU', 'CA', 'RU', 'BR',
];

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  ip: z.string().min(1, 'IP is required').regex(
    /^(\d{1,3}\.){3}\d{1,3}$|^[0-9a-fA-F:]+$/,
    'Enter a valid IPv4 or IPv6 address'
  ),
  country: z.string().min(2, 'Country is required'),
  role: z.enum(['entry', 'relay', 'main', 'standalone']),
});

type Form = z.infer<typeof schema>;

export function ServerFormDialog({
  open,
  onOpenChange,
  server,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, the dialog edits this server; otherwise it creates one */
  server?: Server | null;
  onSaved: () => void;
}) {
  const isEdit = Boolean(server);
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'standalone', country: 'US' },
  });

  useEffect(() => {
    if (open) {
      reset(
        server
          ? { name: server.name, ip: server.ip, country: server.country, role: server.role }
          : { name: '', ip: '', country: 'US', role: 'standalone' }
      );
    }
  }, [open, server, reset]);

  const onSubmit = async (values: Form) => {
    try {
      if (isEdit && server) {
        await serversApi.update(server.id, values);
        toast.success(`Server "${values.name}" updated`);
      } else {
        await serversApi.create(values);
        toast.success(`Server "${values.name}" added`);
      }
      onOpenChange(false);
      onSaved();
    } catch (err) {
      const axiosErr = err as AxiosError<{ error?: string }>;
      toast.error(axiosErr.response?.data?.error || 'Request failed');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit server' : 'Add server'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the server details below.'
              : 'Register a server to monitor.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="SG-Main-01" {...register('name')} />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="ip">IP address</Label>
            <Input id="ip" placeholder="139.180.50.3" {...register('ip')} />
            {errors.ip && <p className="text-xs text-red-500">{errors.ip.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Country</Label>
              <Controller
                control={control}
                name="country"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Country" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Controller
                control={control}
                name="role"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entry">entry</SelectItem>
                      <SelectItem value="relay">relay</SelectItem>
                      <SelectItem value="main">main</SelectItem>
                      <SelectItem value="standalone">standalone</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEdit ? 'Save changes' : 'Add server'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

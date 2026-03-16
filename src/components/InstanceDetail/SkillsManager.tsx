'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Folder, Upload, Trash2, Loader2, Package, FileText } from 'lucide-react';
import JSZip from 'jszip';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toaster';
import { api } from '@/lib/api-client';

interface Skill {
  name: string;
  path: string;
  files: string[];
}

interface SkillsManagerProps {
  instanceId: string;
  instanceName: string;
  containerId?: string;
}

export function SkillsManager({ instanceId, instanceName, containerId }: SkillsManagerProps) {
  const { toast } = useToast();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculate the workspace path
  const workspacePath = `./workspace/openclaw-${instanceName}/workspace/skills`;

  // Fetch skills list
  const fetchSkills = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/containers/${instanceId}/skills`);
      if (response.ok) {
        const data = await response.json();
        setSkills(data.skills || []);
      } else {
        // If the endpoint doesn't exist, try to get skills from workspace
        const error = await response.json();
        console.error('Failed to fetch skills:', error);
        setSkills([]);
      }
    } catch (error) {
      console.error('Error fetching skills:', error);
      setSkills([]);
    } finally {
      setLoading(false);
    }
  }, [instanceId]);

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check if it's a zip file
    if (!file.name.endsWith('.zip')) {
      toast({
        title: 'Invalid file',
        description: 'Please upload a ZIP file',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    try {
      // Read the zip file
      const zip = await JSZip.loadAsync(file);

      // Get the root folder name from the zip
      const rootFolders = Object.keys(zip.files).filter(name => {
        const parts = name.split('/');
        return parts.length === 2 && parts[1] === '';
      });

      let skillName = file.name.replace('.zip', '');

      // If there's a root folder in the zip, use that as skill name
      if (rootFolders.length > 0) {
        skillName = rootFolders[0].replace('/', '');
      }

      // Convert zip to base64
      const zipBase64 = await fileToBase64(file);

      // Upload to server
      const response = await api.post(`/api/containers/${instanceId}/skills`, {
        skillName,
        zipBase64,
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Skill "${skillName}" installed successfully`,
          variant: 'success',
        });
        fetchSkills();
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to install skill',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error uploading skill:', error);
      toast({
        title: 'Error',
        description: 'Failed to process ZIP file',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Handle skill deletion
  const handleDeleteSkill = async (skillName: string) => {
    if (!confirm(`Are you sure you want to delete the skill "${skillName}"?`)) {
      return;
    }

    setDeleting(skillName);

    try {
      const response = await api.delete(`/api/containers/${instanceId}/skills/${skillName}`);

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Skill "${skillName}" deleted successfully`,
          variant: 'success',
        });
        fetchSkills();
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to delete skill',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error deleting skill:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete skill',
        variant: 'destructive',
      });
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Skills Management</h2>
          <p className="text-sm text-muted-foreground">
            Manage skills for {instanceName}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Skills directory: {workspacePath}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip"
            onChange={handleFileUpload}
            className="hidden"
            disabled={uploading}
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            {uploading ? 'Installing...' : 'Install Skill (ZIP)'}
          </Button>
        </div>
      </div>

      {/* Skills List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : skills.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No skills installed</p>
            <p className="text-sm text-muted-foreground mt-1">
              Upload a ZIP file to install a skill
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {skills.map((skill) => (
            <Card key={skill.name} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Folder className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{skill.name}</CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteSkill(skill.name)}
                    disabled={deleting === skill.name}
                    title="Delete skill"
                  >
                    {deleting === skill.name ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 text-destructive" />
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>{skill.files.length} files</span>
                </div>
                {skill.files.length > 0 && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    {skill.files.slice(0, 3).join(', ')}
                    {skill.files.length > 3 && ` +${skill.files.length - 3} more`}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Help Text */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">How to install skills</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>1. Prepare a ZIP file containing your skill files</p>
          <p>2. The ZIP file should contain a folder with the skill name at the root level</p>
          <p>3. Click "Install Skill (ZIP)" and select your ZIP file</p>
          <p>4. The skill will be extracted to: <code className="bg-muted px-1 rounded">{workspacePath}</code></p>
        </CardContent>
      </Card>
    </div>
  );
}

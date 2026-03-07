import { Save, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

export function Settings() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-slate-900 mb-1">Settings</h2>
        <p className="text-sm text-slate-600">
          Configure your analysis preferences and profile
        </p>
      </div>

      {/* Professor Profile */}
      <Card className="border-slate-200">
        <CardHeader className="border-b border-slate-200 pb-4">
          <CardTitle className="text-slate-900">Professor Profile</CardTitle>
          <CardDescription>Your academic information</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" defaultValue="Dr. Sarah Mitchell" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input id="department" defaultValue="Computer Science" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="university">University</Label>
              <Input id="university" defaultValue="State University" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" defaultValue="s.mitchell@university.edu" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Default Analysis Settings */}
      <Card className="border-slate-200">
        <CardHeader className="border-b border-slate-200 pb-4">
          <CardTitle className="text-slate-900">Default Analysis Modules</CardTitle>
          <CardDescription>
            These modules will be enabled by default for new document uploads
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-900">Citation Analysis</p>
              <p className="text-xs text-slate-600">Identify missing or incomplete citations</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-900">Reference Validation</p>
              <p className="text-xs text-slate-600">Verify cited sources and detect fabrication</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-900">Factual Consistency Review</p>
              <p className="text-xs text-slate-600">Detect contradictions and factual issues</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-900">Writing Style Consistency</p>
              <p className="text-xs text-slate-600">Identify unusual style variations</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-900">AI Review Assistance</p>
              <p className="text-xs text-slate-600">Note patterns that may indicate assistance</p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      {/* Local Processing */}
      <Card className="border-slate-200">
        <CardHeader className="border-b border-slate-200 pb-4">
          <CardTitle className="text-slate-900">Local Processing</CardTitle>
          <CardDescription>Configure local analysis settings</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-900">Enable Local AI Analysis</p>
              <p className="text-xs text-slate-600">
                Process documents using local models (requires additional setup)
              </p>
            </div>
            <Switch />
          </div>
          <div className="space-y-2">
            <Label htmlFor="storage">Document Storage Location</Label>
            <div className="flex gap-2">
              <Input 
                id="storage" 
                defaultValue="/Users/professor/Documents/AcademicReview" 
                className="flex-1"
                readOnly
              />
              <Button variant="outline">Browse</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Retention */}
      <Card className="border-slate-200">
        <CardHeader className="border-b border-slate-200 pb-4">
          <CardTitle className="text-slate-900">Data Retention</CardTitle>
          <CardDescription>Manage how long documents are stored</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="retention">Automatic Deletion After</Label>
            <Select defaultValue="1year">
              <SelectTrigger id="retention">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3months">3 Months</SelectItem>
                <SelectItem value="6months">6 Months</SelectItem>
                <SelectItem value="1year">1 Year</SelectItem>
                <SelectItem value="2years">2 Years</SelectItem>
                <SelectItem value="never">Never (Manual Only)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-900">Auto-delete Reviewed Documents</p>
              <p className="text-xs text-slate-600">
                Automatically remove documents marked as reviewed
              </p>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>

      {/* Interface Preferences */}
      <Card className="border-slate-200">
        <CardHeader className="border-b border-slate-200 pb-4">
          <CardTitle className="text-slate-900">Interface Preferences</CardTitle>
          <CardDescription>Customize your workspace</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="theme">Color Theme</Label>
            <Select defaultValue="light">
              <SelectTrigger id="theme">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="auto">Auto (System)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="density">Display Density</Label>
            <Select defaultValue="comfortable">
              <SelectTrigger id="density">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="compact">Compact</SelectItem>
                <SelectItem value="comfortable">Comfortable</SelectItem>
                <SelectItem value="spacious">Spacious</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-900">Show Severity Badges</p>
              <p className="text-xs text-slate-600">Display color-coded severity indicators</p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      {/* Privacy Notice */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Shield className="h-5 w-5 text-blue-700 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-blue-900 mb-1">Privacy & Data Security</p>
              <p className="text-xs text-blue-700 leading-relaxed">
                All document analysis is performed locally on your computer. No student papers or 
                analysis data are transmitted to external servers or cloud services. Documents are 
                stored only in the location you specify above. This tool is designed for local use 
                only and complies with academic privacy requirements.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <Button variant="outline">Reset to Defaults</Button>
        <Button className="bg-slate-900 hover:bg-slate-800">
          <Save className="h-4 w-4 mr-2" />
          Save Settings
        </Button>
      </div>
    </div>
  );
}

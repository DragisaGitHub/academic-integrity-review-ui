import { FileText } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Link } from 'react-router';

export function Analyses() {
  return (
    <div className="max-w-4xl mx-auto">
      <Card className="border-slate-200">
        <CardContent className="p-12 text-center">
          <FileText className="h-16 w-16 text-slate-400 mx-auto mb-4" />
          <h3 className="text-slate-900 mb-2">No Active Analyses</h3>
          <p className="text-sm text-slate-600 mb-6 max-w-md mx-auto">
            Upload a document to begin analyzing student papers for academic integrity patterns.
          </p>
          <Link to="/upload">
            <Button className="bg-slate-900 hover:bg-slate-800">
              Upload Document
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

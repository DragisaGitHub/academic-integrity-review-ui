import { FileQuestion } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Link } from 'react-router';

export function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="border-slate-200 max-w-md">
        <CardContent className="p-12 text-center">
          <FileQuestion className="h-16 w-16 text-slate-400 mx-auto mb-4" />
          <h3 className="text-slate-900 mb-2">Page Not Found</h3>
          <p className="text-sm text-slate-600 mb-6">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <Link to="/">
            <Button className="bg-slate-900 hover:bg-slate-800">
              Return to Dashboard
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

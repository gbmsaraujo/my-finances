import { Skeleton } from '@/components/ui/skeleton';

export default function AuthLoading() {
    return (
        <main className='min-h-screen bg-slate-100 flex items-center justify-center p-4'>
            <div className='w-full max-w-sm rounded-xl bg-white p-6 shadow-md space-y-4'>
                <Skeleton className='h-8 w-28' />
                <Skeleton className='h-4 w-64' />
                <div className='space-y-3'>
                    <Skeleton className='h-10 w-full' />
                    <Skeleton className='h-10 w-full' />
                    <Skeleton className='h-10 w-full' />
                </div>
                <Skeleton className='h-10 w-full' />
            </div>
        </main>
    );
}

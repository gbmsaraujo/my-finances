import { Skeleton } from '@/components/ui/skeleton';

export default function AppLoading() {
    return (
        <main className='mx-auto w-full max-w-4xl p-4 md:p-6 space-y-4'>
            <div className='space-y-2'>
                <Skeleton className='h-8 w-44' />
                <Skeleton className='h-4 w-72' />
            </div>

            <div className='grid gap-3'>
                <Skeleton className='h-24 w-full' />
                <Skeleton className='h-24 w-full' />
                <Skeleton className='h-24 w-full' />
            </div>
        </main>
    );
}

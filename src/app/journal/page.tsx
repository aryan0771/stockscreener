import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function JournalPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    redirect("/login");
  }

  const journals = await prisma.investmentJournal.findMany({
    where: { userId: session.user.id },
    include: { stock: true },
    orderBy: { updatedAt: 'desc' },
  });

  return (
    <div className="container py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Investment Journals</h1>
        <p className="text-muted-foreground">
          Review all your recorded investment theses and historical notes.
        </p>
      </div>

      {journals.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 border-dashed">
          <CardHeader className="text-center">
            <CardTitle>No Journals Found</CardTitle>
            <CardDescription>You haven't written any investment journals yet.</CardDescription>
            <div className="mt-4">
              <Link href="/screener">
                <Button>Find Stocks to Analyze</Button>
              </Link>
            </div>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {journals.map((j) => (
            <Card key={j.id} className="flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">
                      <Link href={`/stocks/${j.stock.ticker}`} className="hover:underline">
                        {j.stock.ticker}
                      </Link>
                    </CardTitle>
                    <CardDescription>{j.stock.companyName}</CardDescription>
                  </div>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                    {j.updatedAt.toLocaleDateString()}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                {j.buyThesis && (
                  <div>
                    <h4 className="text-sm font-semibold mb-1">Buy Thesis Snippet</h4>
                    <div 
                      className="text-sm text-muted-foreground line-clamp-3 prose prose-sm dark:prose-invert"
                      dangerouslySetInnerHTML={{ __html: j.buyThesis }} 
                    />
                  </div>
                )}
                {!j.buyThesis && j.riskFactors && (
                  <div>
                    <h4 className="text-sm font-semibold mb-1">Risk Factors Snippet</h4>
                    <div 
                      className="text-sm text-muted-foreground line-clamp-3 prose prose-sm dark:prose-invert"
                      dangerouslySetInnerHTML={{ __html: j.riskFactors }} 
                    />
                  </div>
                )}
              </CardContent>
              <div className="p-6 pt-0 mt-auto">
                <Link href={`/stocks/${j.stock.ticker}`}>
                  <Button variant="outline" className="w-full">Edit Journal</Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

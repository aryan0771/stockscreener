"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, User, Menu } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Navbar() {
  const { data: session } = useSession();
  const router = useRouter();
  const [search, setSearch] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      router.push(`/stocks/${search.trim().toUpperCase()}`);
      setSearch("");
    }
  };

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full">
      <div className="container flex h-16 items-center px-4">
        
        {/* Mobile Menu */}
        <div className="flex md:hidden mr-2">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex h-10 w-10 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle navigation menu</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem>
                <Link href="/" className="w-full flex-1">Home</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Link href="/dashboard" className="w-full flex-1">Dashboard</Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link href="/screener" className="w-full flex-1">Screener</Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link href="/watchlists" className="w-full flex-1">Watchlists</Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link href="/journal" className="w-full flex-1">Journal</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Brand Link (Always visible but compact on mobile) */}
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <span className="font-bold inline-block text-lg">InvestIQ</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="mr-4 hidden md:flex">
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link href="/dashboard" className="transition-colors hover:text-foreground/80 text-foreground/60">
              Dashboard
            </Link>
            <Link href="/screener" className="transition-colors hover:text-foreground/80 text-foreground/60">
              Screener
            </Link>
            <Link href="/watchlists" className="transition-colors hover:text-foreground/80 text-foreground/60">
              Watchlists
            </Link>
            <Link href="/journal" className="transition-colors hover:text-foreground/80 text-foreground/60">
              Journal
            </Link>
          </nav>
        </div>

        <div className="flex flex-1 items-center justify-end space-x-2">
          <div className="w-full max-w-[130px] sm:max-w-[200px] lg:max-w-[300px]">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search..."
                className="w-full bg-background pl-8 h-9 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </form>
          </div>
          <nav className="flex items-center space-x-2">
            {session ? (
              <DropdownMenu>
                <DropdownMenuTrigger className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-accent hover:text-accent-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                  <User className="h-5 w-5" />
                  <span className="sr-only">Toggle user menu</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">My Account</div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Link href="/profile" className="w-full flex-1 cursor-pointer">
                      Profile Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link href="/dashboard/portfolio" className="w-full flex-1 cursor-pointer">
                      Paper Portfolio
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer text-red-600 dark:text-red-400">
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost">Log in</Button>
                </Link>
                <Link href="/register">
                  <Button>Sign Up</Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </nav>
  );
}

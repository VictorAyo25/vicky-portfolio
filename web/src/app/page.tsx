import Hero from "@/components/Hero";
import FeaturedPosts from "@/components/FeaturedPosts";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Hero />
      <FeaturedPosts />
    </main>
  );
}

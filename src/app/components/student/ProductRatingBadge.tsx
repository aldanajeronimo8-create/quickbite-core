import { useEffect, useState } from 'react';
import { Heart, Star } from 'lucide-react';
import { toast } from 'sonner';
import { quickbiteApi } from '../../../services/api/quickbiteApi';

type RatingSummary = { average_stars: number; review_count: number };

const cache = new Map<string, RatingSummary | null>();
const pending = new Map<string, Promise<RatingSummary | null>>();

async function loadRating(productId: string) {
  try { return (await quickbiteApi().productRating(productId)).rating; } catch { return null; }
}

export function ProductRatingBadge({ productId }: { productId: string }) {
  const [rating, setRating] = useState<RatingSummary | null>(() => cache.get(productId) ?? null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [savingFavorite, setSavingFavorite] = useState(false);

  useEffect(() => {
    let mounted = true;
    const ratingPromise = loadRating(productId).then((value) => { cache.set(productId, value); return value; });
    pending.set(productId, ratingPromise);
    void ratingPromise.then((value) => { if (mounted) setRating(value); }).finally(() => pending.delete(productId));
    void quickbiteApi().favorites().then((result) => {
      if (mounted) setIsFavorite(result.items.some((item) => item.product_id === productId));
    }).catch(() => {
      if (mounted) setIsFavorite(false);
    });
    return () => { mounted = false; };
  }, [productId]);


  const toggleFavorite = async () => {
    if (savingFavorite) return;
    setSavingFavorite(true);
    try {
      if (isFavorite) {
        await quickbiteApi().removeFavorite(productId);
        setIsFavorite(false);
        toast.success('Quitado de favoritos.');
      } else {
        await quickbiteApi().addFavorite(productId);
        setIsFavorite(true);
        toast.success('Agregado a favoritos.');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo actualizar el favorito.');
    } finally {
      setSavingFavorite(false);
    }
  };


  return <div className="flex items-center gap-2">
    <button
      type="button"
      onClick={() => void toggleFavorite()}
      disabled={savingFavorite}
      aria-label={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
      aria-pressed={isFavorite}
      className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border transition ${isFavorite ? 'border-rose-300 bg-rose-50 text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300' : 'border-slate-200 bg-white text-slate-400 hover:border-rose-200 hover:text-rose-500 dark:border-slate-700 dark:bg-[#0D111D] dark:text-slate-500 dark:hover:border-rose-500/30 dark:hover:text-rose-300'}`}
      title={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
    >
      <Heart className="h-4 w-4" fill={isFavorite ? 'currentColor' : 'none'} />
    </button>
    {rating && rating.review_count > 0 && <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-300" aria-label={`${rating.average_stars.toFixed(1)} de 5, ${rating.review_count} opiniones`}>
      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
      {rating.average_stars.toFixed(1)} <span className="text-slate-400 dark:text-slate-500">({rating.review_count})</span>
    </span>}
  </div>;
}

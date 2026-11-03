type Props = {
  media: { avif: string; webp: string };
  alt: string;
  className?: string;
  priority?: boolean;
};

/** AVIF with WebP fallback; the poster variant is the LCP element. */
export function IntroPicture({ media, alt, className, priority = false }: Props) {
  return (
    <picture>
      <source srcSet={media.avif} type="image/avif" />
      {}
      <img
        src={media.webp}
        alt={alt}
        className={className}
        width={1920}
        height={1080}
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
        loading={priority ? 'eager' : 'lazy'}
      />
    </picture>
  );
}

import type { ProductionServiceProvider } from "@/lib/agent-config/defaults";

type Props = {
  providerId: ProductionServiceProvider;
  className?: string;
};

const SERVICE_PROVIDER_ICONS: Partial<
  Record<
    ProductionServiceProvider,
    {
      color: string;
      path: string;
    }
  >
> = {
  supabase: {
    color: "#3FCF8E",
    path: "M11.9 1.036c-.015-.986-1.26-1.41-1.874-.637L.764 12.05C-.33 13.427.65 15.455 2.409 15.455h9.579l.113 7.51c.014.985 1.259 1.408 1.873.636l9.262-11.653c1.093-1.375.113-3.403-1.645-3.403h-9.642z",
  },
  upstash: {
    color: "#00E9A3",
    path: "M13.8027 0C11.193 0 8.583.9952 6.5918 2.9863c-3.9823 3.9823-3.9823 10.4396 0 14.4219 1.9911 1.9911 5.2198 1.9911 7.211 0 1.991-1.9911 1.991-5.2198 0-7.211L12 12c.9956.9956.9956 2.6098 0 3.6055-.9956.9955-2.6099.9955-3.6055 0-2.9866-2.9868-2.9866-7.8297 0-10.8164 2.9868-2.9868 7.8297-2.9868 10.8164 0l1.8028-1.8028C19.0225.9952 16.4125 0 13.8027 0zM12 12c-.9956-.9956-.9956-2.6098 0-3.6055.9956-.9955 2.6098-.9955 3.6055 0 2.9867 2.9868 2.9867 7.8297 0 10.8164-2.9867 2.9868-7.8297 2.9868-10.8164 0l-1.8028 1.8028c3.9823 3.9822 10.4396 3.9822 14.4219 0 3.9823-3.9824 3.9823-10.4396 0-14.4219-.9956-.9956-2.3006-1.4922-3.6055-1.4922-1.3048 0-2.6099.4966-3.6054 1.4922-1.9912 1.9912-1.9912 5.2198 0 7.211z",
  },
};

const ServiceProviderLogo = ({ providerId, className = "size-4" }: Props) => {
  const icon = SERVICE_PROVIDER_ICONS[providerId];
  if (!icon) return null;

  return (
    <svg
      aria-hidden="true"
      className={`shrink-0 ${className}`}
      fill={icon.color}
      viewBox="0 0 24 24"
    >
      <path d={icon.path} />
    </svg>
  );
};

export default ServiceProviderLogo;

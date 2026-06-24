import type { DeploymentTarget } from "@/lib/agent-config/defaults";

type DeploymentTargetLogoProps = {
  target: DeploymentTarget;
  className?: string;
};

const DeploymentTargetLogo = ({ target, className }: DeploymentTargetLogoProps) => {
  if (target === "vercel") {
    return (
      <svg className={`size-4 ${className ?? ""}`} viewBox="0 0 24 24" aria-hidden>
        <path fill="currentColor" d="M12 2 23 21H1L12 2Z" />
      </svg>
    );
  }

  if (target === "cloudflare") {
    return (
      <svg className={`size-4 ${className ?? ""}`} viewBox="0 0 24 24" aria-hidden>
        <path
          fill="#F6821F"
          d="M7.2 17.6h10.4c2.1 0 3.8-1.5 3.8-3.5 0-1.8-1.4-3.3-3.3-3.5A5.7 5.7 0 0 0 7.3 8.5a4.6 4.6 0 0 0-.1 9.1Z"
        />
        <path
          fill="#FDBB30"
          d="M5.7 17.6h8.7c1.7 0 3.1-1.2 3.1-2.8 0-1.5-1.2-2.7-2.8-2.8a4.7 4.7 0 0 0-8.9-1.8A3.7 3.7 0 0 0 5.7 17.6Z"
        />
      </svg>
    );
  }

  if (target === "railway") {
    return (
      <svg className={`size-4 ${className ?? ""}`} viewBox="0 0 24 24" aria-hidden>
        <rect width="24" height="24" rx="5.5" fill="#0B0D0E" />
        <path
          fill="#FFFFFF"
          d="M5 16.9h5.1L18.7 7H13.6L5 16.9Zm7.1 0H19v-2.3h-4.9l-2 2.3ZM7.4 7 5 9.8h4.9L12.3 7H7.4Z"
        />
      </svg>
    );
  }

  if (target === "docker") {
    return (
      <svg className={`size-4 ${className ?? ""}`} viewBox="0 0 24 24" aria-hidden>
        <path
          fill="#2496ED"
          d="M21.2 11.6c-.6 4.4-3.6 6.9-8.4 6.9H8.2c-3.1 0-5.5-1.8-6.3-4.5-.2-.7.3-1.4 1.1-1.4h15.6c.8 0 1.7-.3 2.3-1h.3Z"
        />
        <path fill="#2496ED" d="M6.1 6.3h2.5v2.5H6.1V6.3Zm3.1 0h2.5v2.5H9.2V6.3Z" />
        <path fill="#2496ED" d="M9.2 9.3h2.5v2.5H9.2V9.3Zm3.1 0h2.5v2.5h-2.5V9.3Z" />
        <path fill="#2496ED" d="M6.1 9.3h2.5v2.5H6.1V9.3Zm9.3 0h2.5v2.5h-2.5V9.3Z" />
      </svg>
    );
  }

  return (
    <svg className={`size-4 ${className ?? ""}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M5 6.5h14v9H5v-9Zm3 12h8m-4-3v3"
      />
    </svg>
  );
};

export default DeploymentTargetLogo;

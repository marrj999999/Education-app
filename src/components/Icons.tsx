/**
 * Icon Component Library
 * Uses Heroicons (MIT License) - https://heroicons.com
 * Compatible with Google Material Symbols style
 */

import React from 'react';

interface IconProps {
  className?: string;
  size?: number | string;
}

// Default icon wrapper
const Icon: React.FC<IconProps & { children: React.ReactNode }> = ({
  className = '',
  size = 24,
  children
}) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
);

// Bamboo/Plant icon (brand)
export const BambooIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path d="M6 21V3m0 18c3 0 6-2 6-6V3M6 3c3 0 6 2 6 6m6 12V9m0 12c-3 0-6-2-6-6V9m6 0c-3 0-6 2-6 6" />
  </Icon>
);

// Module/Folder icon
export const ModuleIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
  </Icon>
);

// Book/Lesson icon
export const BookIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
  </Icon>
);

// Document/Page icon
export const DocumentIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </Icon>
);

// Certificate/Badge icon
export const CertificateIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
  </Icon>
);

// Lightning/Level icon
export const LevelIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
  </Icon>
);

// Home icon
export const HomeIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
  </Icon>
);

// Check/Complete icon
export const CheckIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path d="M4.5 12.75l6 6 9-13.5" />
  </Icon>
);

// Check Circle icon
export const CheckCircleIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </Icon>
);

// Arrow Right/Chevron icon
export const ChevronRightIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </Icon>
);

// Arrow Left icon
export const ChevronLeftIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path d="M15.75 19.5L8.25 12l7.5-7.5" />
  </Icon>
);

// Clock/Time icon
export const ClockIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </Icon>
);

// Help/Question icon
export const HelpIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
  </Icon>
);

// Warning/Alert icon
export const WarningIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
  </Icon>
);

// External Link icon
export const ExternalLinkIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
  </Icon>
);

// Printer icon
export const PrinterIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
  </Icon>
);

// List/Menu icon
export const ListIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
  </Icon>
);

// Archive/Box icon
export const ArchiveIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
  </Icon>
);

// Academic Cap/Graduation icon
export const AcademicCapIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
  </Icon>
);

// Play/Video icon
export const PlayIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
  </Icon>
);

// Clipboard/Assessment icon
export const ClipboardIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
  </Icon>
);

// Cog/Settings icon
export const CogIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
    <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </Icon>
);

// Wrench/Tools icon
export const WrenchIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
  </Icon>
);

// Bicycle icon (custom)
export const BicycleIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <circle cx="5.5" cy="15.5" r="3.5" fill="none" />
    <circle cx="18.5" cy="15.5" r="3.5" fill="none" />
    <path d="M5.5 15.5L8.5 8h5l2 7.5M8.5 8l3.5 7.5M12 8v3m0 0l6.5 4.5M12 11l-3.5 4.5" />
  </Icon>
);

// Image/Photo icon
export const ImageIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
  </Icon>
);

// Computer/Software icon
export const ComputerIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
  </Icon>
);

// Chat/Feedback icon
export const ChatIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
  </Icon>
);

// Paint/Style icon
export const PaintIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
  </Icon>
);

// Menu/Hamburger icon
export const MenuIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
  </Icon>
);

// Check Filled icon (solid version for completed state)
export const CheckFilledIcon: React.FC<IconProps & { className?: string; size?: number | string }> = ({
  className = '',
  size = 24
}) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 20 20"
    fill="currentColor"
  >
    <path
      fillRule="evenodd"
      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
      clipRule="evenodd"
    />
  </svg>
);

// Download icon
export const DownloadIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </Icon>
);

// Link/Chain icon
export const LinkIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
  </Icon>
);

// Lightbulb icon (for callout default)
export const LightbulbIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
  </Icon>
);

// Target/Bullseye icon (for learning objectives)
export const TargetIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1" />
  </Icon>
);

// Map Pin icon (for setup locations)
export const MapPinIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
    <path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
  </Icon>
);

// Megaphone icon (for introductions)
export const MegaphoneIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" />
  </Icon>
);

// Pause icon (for breaks)
export const PauseIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
  </Icon>
);

// Info Circle icon (for info notes)
export const InfoIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
  </Icon>
);

// Map function to get icon by name (for dynamic usage)
export const iconMap: Record<string, React.FC<IconProps>> = {
  bamboo: BambooIcon,
  module: ModuleIcon,
  book: BookIcon,
  document: DocumentIcon,
  certificate: CertificateIcon,
  level: LevelIcon,
  home: HomeIcon,
  check: CheckIcon,
  'check-circle': CheckCircleIcon,
  'check-filled': CheckFilledIcon,
  'chevron-right': ChevronRightIcon,
  'chevron-left': ChevronLeftIcon,
  clock: ClockIcon,
  help: HelpIcon,
  warning: WarningIcon,
  'external-link': ExternalLinkIcon,
  printer: PrinterIcon,
  list: ListIcon,
  menu: MenuIcon,
  archive: ArchiveIcon,
  'academic-cap': AcademicCapIcon,
  play: PlayIcon,
  clipboard: ClipboardIcon,
  cog: CogIcon,
  wrench: WrenchIcon,
  bicycle: BicycleIcon,
  image: ImageIcon,
  computer: ComputerIcon,
  chat: ChatIcon,
  paint: PaintIcon,
  download: DownloadIcon,
  link: LinkIcon,
  lightbulb: LightbulbIcon,
  target: TargetIcon,
  'map-pin': MapPinIcon,
  megaphone: MegaphoneIcon,
  pause: PauseIcon,
  info: InfoIcon,
};

// Dynamic Icon component
export const DynamicIcon: React.FC<IconProps & { name: string }> = ({ name, ...props }) => {
  const IconComponent = iconMap[name] || DocumentIcon;
  return <IconComponent {...props} />;
};

export default {
  BambooIcon,
  ModuleIcon,
  BookIcon,
  DocumentIcon,
  CertificateIcon,
  LevelIcon,
  HomeIcon,
  CheckIcon,
  CheckCircleIcon,
  CheckFilledIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  ClockIcon,
  HelpIcon,
  WarningIcon,
  ExternalLinkIcon,
  PrinterIcon,
  ListIcon,
  MenuIcon,
  ArchiveIcon,
  AcademicCapIcon,
  PlayIcon,
  ClipboardIcon,
  CogIcon,
  WrenchIcon,
  BicycleIcon,
  ImageIcon,
  ComputerIcon,
  ChatIcon,
  PaintIcon,
  DownloadIcon,
  LinkIcon,
  LightbulbIcon,
  TargetIcon,
  MapPinIcon,
  MegaphoneIcon,
  PauseIcon,
  InfoIcon,
  DynamicIcon,
};

import React, { useEffect, useState } from 'react';
import { AlertCircle, X, ShieldAlert, ArrowUpCircle, Terminal, Check } from 'lucide-react';

interface UpdateNotifierProps { }

/**
 * Checks for known vulnerabilities using the OSV API
 * @param packageName The name of the package (e.g., 'react')
 * @param version The installed version to check
 * @returns true if vulnerabilities are found
 */
const checkVulnerabilities = async (packageName: string, Kpversion: string): Promise<boolean> => {
    try {
        const response = await fetch('https://api.osv.dev/v1/query', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                package: {
                    name: packageName,
                    ecosystem: 'npm'
                },
                version: Kpversion
            })
        });

        if (!response.ok) return false;

        const data = await response.json();
        // If 'vulns' array exists and has items, it's vulnerable
        return data.vulns && data.vulns.length > 0;
    } catch (error) {
        console.error('Error checking vulnerabilities:', error);
        return false;
    }
};

const UpdateNotifier: React.FC<UpdateNotifierProps> = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [copied, setCopied] = useState(false);
    const [updateInfo, setUpdateInfo] = useState<{
        current: string;
        latest: string;
        isSecurityUpdate: boolean;
    } | null>(null);

    useEffect(() => {
        const checkVersion = async () => {
            try {
                // 1. Fetch latest version info from jsDelivr (CORS friendly)
                const response = await fetch('https://data.jsdelivr.com/v1/packages/npm/react');

                if (!response.ok) {
                    console.warn("Failed to check for updates");
                    return;
                }

                const data = await response.json();
                const latest = data.tags?.latest;

                // We use the runtime React version
                const current = React.version;

                if (!latest) return;

                // 2. Simple Comparison: Is there a newer version?
                if (latest !== current) {
                    // 3. Security Check: Is the *current* version vulnerable?
                    // We check this via OSV API dynamic check
                    const isVulnerable = await checkVulnerabilities('react', current);

                    setUpdateInfo({
                        current,
                        latest,
                        isSecurityUpdate: isVulnerable
                    });
                    setIsVisible(true);
                }
            } catch (error) {
                console.error('Error checking for updates:', error);
            }
        };

        checkVersion();
    }, []);

    const handleCopyCommand = () => {
        navigator.clipboard.writeText('npm update react react-dom');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!isVisible || !updateInfo) return null;

    return (
        <div className={`fixed bottom-4 right-4 z-50 max-w-sm w-full shadow-2xl rounded-lg border-l-4 overflow-hidden transition-all duration-500 transform translate-y-0 ${updateInfo.isSecurityUpdate ? 'bg-red-50 border-red-500' : 'bg-white border-amber-500'
            }`}>
            <div className="p-4">
                <div className="flex items-start">
                    <div className="flex-shrink-0">
                        {updateInfo.isSecurityUpdate ? (
                            <ShieldAlert className="h-6 w-6 text-red-500" />
                        ) : (
                            <ArrowUpCircle className="h-6 w-6 text-amber-500" />
                        )}
                    </div>
                    <div className="ml-3 w-0 flex-1 pt-0.5">
                        <p className={`text-sm font-bold ${updateInfo.isSecurityUpdate ? 'text-red-800' : 'text-amber-800'}`}>
                            {updateInfo.isSecurityUpdate ? 'Security Update Available' : 'Update Available'}
                        </p>
                        <p className={`mt-1 text-sm ${updateInfo.isSecurityUpdate ? 'text-red-700' : 'text-stone-600'}`}>
                            A new version of React is available.
                            <br />
                            <span className="font-mono text-xs mt-1 inline-block bg-black/5 px-1.5 py-0.5 rounded">v{updateInfo.current} → v{updateInfo.latest}</span>
                        </p>
                        {updateInfo.isSecurityUpdate && (
                            <p className="mt-2 text-xs text-red-600 font-semibold">
                                Your current version has known vulnerabilities. Update recommended.
                            </p>
                        )}
                        <div className="mt-4 flex gap-2">
                            <button
                                onClick={handleCopyCommand}
                                className={`flex-1 text-xs font-bold px-3 py-2 rounded shadow-sm flex items-center justify-center gap-1.5 transition-colors ${updateInfo.isSecurityUpdate
                                    ? 'bg-red-600 text-white hover:bg-red-700'
                                    : 'bg-amber-500 text-white hover:bg-amber-600'
                                    }`}>
                                {copied ? <Check className="w-3 h-3" /> : <Terminal className="w-3 h-3" />}
                                {copied ? 'Command Copied!' : 'Copy Update Cmd'}
                            </button>
                            <button
                                onClick={() => setIsVisible(false)}
                                className={`text-xs font-medium px-3 py-2 rounded transition-colors border ${updateInfo.isSecurityUpdate
                                    ? 'border-red-200 text-red-700 hover:bg-red-100'
                                    : 'border-amber-200 text-amber-700 hover:bg-amber-100'
                                    }`}>
                                Dismiss
                            </button>
                        </div>
                    </div>
                    <div className="ml-4 flex-shrink-0 flex">
                        <button
                            className="bg-transparent rounded-md inline-flex text-stone-400 hover:text-stone-500 focus:outline-none"
                            onClick={() => setIsVisible(false)}
                        >
                            <span className="sr-only">Close</span>
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UpdateNotifier;

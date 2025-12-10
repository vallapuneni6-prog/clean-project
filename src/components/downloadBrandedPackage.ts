import { CustomerPackage, PackageTemplate, Outlet, ServiceRecord, CustomerSittingsPackage, SittingsPackage } from '../types';
import html2canvas from 'html2canvas';

export const generateBrandedPackageInvoiceImage = async (customerPackage: CustomerPackage, template: PackageTemplate, outlet: Outlet, initialServices: ServiceRecord[]): Promise<string> => {
    try {
        // Load logo as data URL
        let logoDataUrl = '';
        try {
            const logoResponse = await fetch('/logo.png');
            const logoBlob = await logoResponse.blob();
            logoDataUrl = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(logoBlob);
            });
        } catch (error) {
            console.warn('Failed to load logo:', error);
            logoDataUrl = '';
        }

        // Create a temporary container to render the invoice
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.left = '-9999px';
        container.style.width = '400px';
        container.style.backgroundColor = 'white';

        const invoiceHTML = `
            <div style="font-family: 'Courier New', monospace; font-size: 12px; line-height: 1.4; padding: 10px; width: 100%; box-sizing: border-box;">
                <div style="display: flex; justify-content: center; margin-bottom: 8px;">
                    ${logoDataUrl ? `<img src="${logoDataUrl}" alt="Logo" style="max-width: 140px; height: auto; filter: grayscale(100%); display: block;">` : ''}
                </div>
                <div style="text-align: center; font-weight: bold; font-size: 13px; margin: 5px 0;">${outlet?.name || 'Business Name'}</div>
                ${outlet?.address ? `<div style="text-align: center; font-size: 11px; margin: 2px 0;">${outlet.address}</div>` : ''}
                ${outlet?.gstin ? `<div style="text-align: center; font-size: 11px; margin: 2px 0;">GSTIN: ${outlet.gstin}</div>` : ''}
                ${outlet?.phone ? `<div style="text-align: center; font-size: 11px; margin: 2px 0;">PHONE: ${outlet.phone}</div>` : ''}
                
                <div style="text-align: center; font-weight: bold; font-size: 12px; margin: 8px 0;">PACKAGE INVOICE</div>
                
                <div style="border-top: 1px dashed #000; margin: 8px 0;"></div>
                
                <table style="width: 100%;">
                    <tr>
                        <td style="text-align: left; padding: 2px 0;">Bill No:</td>
                        <td style="text-align: right; font-weight: bold;">${customerPackage.id.slice(-6).toUpperCase()}</td>
                    </tr>
                    <tr>
                        <td style="text-align: left; padding: 2px 0;">Date:</td>
                        <td style="text-align: right;">${new Date(customerPackage.assignedDate).toLocaleDateString()}</td>
                    </tr>
                </table>
                
                <div style="border-top: 1px dashed #000; margin: 8px 0;"></div>
                
                <div style="margin: 8px 0;">
                    <div style="font-weight: bold;">Customer</div>
                    <div>${customerPackage.customerName}</div>
                    <div>${customerPackage.customerMobile}</div>
                </div>
                
                <div style="border-top: 1px dashed #000; margin: 8px 0;"></div>
                
                <table style="width: 100%; margin: 8px 0; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 4px 2px 8px 2px; text-align: left; font-weight: bold; border-bottom: 1px solid #000;">Package</td>
                        <td style="padding: 4px 2px 8px 2px; text-align: right; font-weight: bold; border-bottom: 1px solid #000;">Value</td>
                    </tr>
                    <tr>
                        <td style="padding: 4px 2px; text-align: left; font-size: 11px;">${template.name}</td>
                        <td style="padding: 4px 2px; text-align: right; font-size: 11px;">₹${template.packageValue.toFixed(2)}</td>
                    </tr>
                </table>
                
                <div style="border-top: 1px dashed #000; margin: 8px 0;"></div>
                
                <table style="width: 100%;">
                    <tr>
                        <td style="text-align: left; padding: 4px 0;">Package Value:</td>
                        <td style="text-align: right; padding: 4px 0;">₹${template.serviceValue.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td style="text-align: left; padding: 4px 0;">Used:</td>
                        <td style="text-align: right; padding: 4px 0;">- ₹${(template.serviceValue - customerPackage.remainingServiceValue).toFixed(2)}</td>
                    </tr>
                    <tr style="border-top: 2px solid #000; border-bottom: 2px solid #000; font-weight: bold; font-size: 14px;">
                        <td style="text-align: left; padding: 6px 0;">BALANCE:</td>
                        <td style="text-align: right; padding: 6px 0;">₹${customerPackage.remainingServiceValue.toFixed(2)}</td>
                    </tr>
                </table>
                
                <div style="border-top: 1px dashed #000; margin: 8px 0;"></div>
                
                <div style="text-align: center; font-size: 10px; color: #666; margin-top: 10px;">
                    Thank you for your business!
                </div>
            </div>
        `;

        container.innerHTML = invoiceHTML;
        document.body.appendChild(container);

        const canvas = await html2canvas(container, {
            backgroundColor: '#ffffff',
            scale: 2,
        });

        document.body.removeChild(container);

        return canvas.toDataURL('image/png');
    } catch (error) {
        console.error('Error generating package invoice image:', error);
        throw error;
    }
};

export const generateBrandedSittingsInvoiceImage = async (
    customerPackage: CustomerSittingsPackage,
    template: SittingsPackage,
    outlet: Outlet,
    staffName?: string
): Promise<string> => {
    try {
        // Load logo as data URL
        let logoDataUrl = '';
        try {
            const logoResponse = await fetch('/logo.png');
            const logoBlob = await logoResponse.blob();
            logoDataUrl = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(logoBlob);
            });
        } catch (error) {
            console.warn('Failed to load logo:', error);
            logoDataUrl = '';
        }

        // Create a temporary container to render the invoice
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.left = '-9999px';
        container.style.width = '400px';
        container.style.backgroundColor = 'white';

        // Calculate the sitting number (total - remaining + 1 for current)
        const sittingNumber = customerPackage.totalSittings - customerPackage.remainingSittings;

        const invoiceHTML = `
            <div style="font-family: 'Courier New', monospace; font-size: 12px; line-height: 1.4; padding: 10px; width: 100%; box-sizing: border-box;">
                <div style="display: flex; justify-content: center; margin-bottom: 8px;">
                    ${logoDataUrl ? `<img src="${logoDataUrl}" alt="Logo" style="max-width: 140px; height: auto; filter: grayscale(100%); display: block;">` : ''}
                </div>
                <div style="text-align: center; font-weight: bold; font-size: 13px; margin: 5px 0;">${outlet?.name || 'Business Name'}</div>
                ${outlet?.address ? `<div style="text-align: center; font-size: 11px; margin: 2px 0;">${outlet.address}</div>` : ''}
                ${outlet?.gstin ? `<div style="text-align: center; font-size: 11px; margin: 2px 0;">GSTIN: ${outlet.gstin}</div>` : ''}
                ${outlet?.phone ? `<div style="text-align: center; font-size: 11px; margin: 2px 0;">PHONE: ${outlet.phone}</div>` : ''}
                
                <div style="text-align: center; font-weight: bold; font-size: 12px; margin: 8px 0;">SITTINGS PACKAGE INVOICE</div>
                
                <div style="border-top: 1px dashed #000; margin: 8px 0;"></div>
                
                <table style="width: 100%;">
                    <tr>
                        <td style="text-align: left; padding: 2px 0;">Bill No:</td>
                        <td style="text-align: right; font-weight: bold;">${customerPackage.id.slice(-6).toUpperCase()}</td>
                    </tr>
                    <tr>
                        <td style="text-align: left; padding: 2px 0;">Date:</td>
                        <td style="text-align: right;">${new Date(customerPackage.assignedDate).toLocaleDateString()}</td>
                    </tr>
                </table>
                
                <div style="border-top: 1px dashed #000; margin: 8px 0;"></div>
                
                <div style="margin: 8px 0;">
                    <div style="font-weight: bold;">Customer</div>
                    <div>${customerPackage.customerName}</div>
                    <div>${customerPackage.customerMobile}</div>
                </div>
                
                <div style="border-top: 1px dashed #000; margin: 8px 0;"></div>
                
                <table style="width: 100%; margin: 8px 0; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 4px 2px 8px 2px; text-align: left; font-weight: bold; border-bottom: 1px solid #000;">Package</td>
                        <td style="padding: 4px 2px 8px 2px; text-align: right; font-weight: bold; border-bottom: 1px solid #000;">Sittings</td>
                    </tr>
                    <tr>
                        <td style="padding: 4px 2px; text-align: left; font-size: 11px;">${template.name}</td>
                        <td style="padding: 4px 2px; text-align: right; font-size: 11px;">${customerPackage.totalSittings}</td>
                    </tr>
                </table>
                
                <div style="border-top: 1px dashed #000; margin: 8px 0;"></div>
                
                <table style="width: 100%;">
                    <tr>
                        <td style="text-align: left; padding: 4px 0;">Service:</td>
                        <td style="text-align: right; padding: 4px 0;">${customerPackage.serviceName || 'N/A'}</td>
                    </tr>
                    ${staffName ? `<tr>
                        <td style="text-align: left; padding: 4px 0;">Staff:</td>
                        <td style="text-align: right; padding: 4px 0;">${staffName}</td>
                    </tr>` : ''}
                    ${customerPackage.usedSittings > 0 ? `<tr>
                        <td style="text-align: left; padding: 4px 0;">Sitting #${sittingNumber}:</td>
                        <td style="text-align: right; padding: 4px 0;">Redeemed</td>
                    </tr>` : ''}
                    <tr>
                        <td style="text-align: left; padding: 4px 0;">Total Sittings:</td>
                        <td style="text-align: right; padding: 4px 0;">${customerPackage.totalSittings}</td>
                    </tr>
                    ${customerPackage.usedSittings > 0 ? `<tr>
                        <td style="text-align: left; padding: 4px 0;">Used:</td>
                        <td style="text-align: right; padding: 4px 0;">- ${customerPackage.usedSittings}</td>
                    </tr>` : ''}
                    <tr style="border-top: 2px solid #000; border-bottom: 2px solid #000; font-weight: bold; font-size: 14px;">
                        <td style="text-align: left; padding: 6px 0;">BALANCE:</td>
                        <td style="text-align: right; padding: 6px 0;">${customerPackage.remainingSittings}</td>
                    </tr>
                </table>
                
                <div style="border-top: 1px dashed #000; margin: 8px 0;"></div>
                
                <div style="text-align: center; font-size: 10px; color: #666; margin-top: 10px;">
                    Thank you for your business!
                </div>
            </div>
        `;

        container.innerHTML = invoiceHTML;
        document.body.appendChild(container);

        const canvas = await html2canvas(container, {
            backgroundColor: '#ffffff',
            scale: 2,
        });

        document.body.removeChild(container);

        return canvas.toDataURL('image/png');
    } catch (error) {
        console.error('Error generating sittings invoice image:', error);
        throw error;
    }
};
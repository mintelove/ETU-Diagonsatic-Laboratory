import mamLogo from '../assets/mam.jpg';
import { usePreferences } from '../context/PreferencesContext.jsx';

export default function AboutUsPage() {
  const { preferences, t } = usePreferences();
  const isAmharic = preferences.language === 'am';

  return (
    <div className="page about-page">
      <div className="about-container">
        {/* Animated Logo Section with Circular Ripple Waves */}
        <div className="about-hero">
          <div className="about-logo-wrapper" title="MaM App Studio Logo">
            <span className="about-ripple-ring ring-1"></span>
            <span className="about-ripple-ring ring-2"></span>
            <span className="about-ripple-ring ring-3"></span>
            <img src={mamLogo} alt="MaM App Studio Logo" className="about-logo-img" />
          </div>
          <h1 className="about-company-title">MaM App Studio</h1>
          <p className="about-tagline">
            {isAmharic
              ? 'ፈጠራ ያለው ቴክኖሎጂ። ብልህ መፍትሔዎች። የተሻለ የንግድ ዕድገት።'
              : 'Innovative Technology. Smart Solutions. Better Business.'}
          </p>
        </div>

        {/* Developer & Contact Card */}
        <div className="about-card about-info-card">
          <h2 className="about-card-heading">
            {isAmharic ? 'የአልሚው እና የመገናኛ መረጃ' : 'Developer & Contact Information'}
          </h2>
          <div className="about-info-grid">
            <div className="about-info-item">
              <span className="about-info-icon" aria-hidden="true">👤</span>
              <div className="about-info-content">
                <span className="about-info-label">{t('developerName')}</span>
                <strong className="about-info-value">Mintesnot Milkias</strong>
              </div>
            </div>

            <div className="about-info-item">
              <span className="about-info-icon" aria-hidden="true">🏢</span>
              <div className="about-info-content">
                <span className="about-info-label">{t('companyName')}</span>
                <strong className="about-info-value">MaM App Studio</strong>
              </div>
            </div>

            <div className="about-info-item">
              <span className="about-info-icon" aria-hidden="true">📞</span>
              <div className="about-info-content">
                <span className="about-info-label">{t('contactPhone')}</span>
                <a href="tel:0916733489" className="about-email-link">
                  0916733489
                </a>
              </div>
            </div>

            <div className="about-info-item">
              <span className="about-info-icon" aria-hidden="true">✉️</span>
              <div className="about-info-content">
                <span className="about-info-label">{t('contactEmail')}</span>
                <a href="mailto:mamappstudio00@gmail.com" className="about-email-link">
                  mamappstudio00@gmail.com
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Company Description Card */}
        <div className="about-card about-desc-card">
          <h2 className="about-card-heading">
            {isAmharic ? 'ስለ MaM App Studio' : 'About MaM App Studio'}
          </h2>
          <div className="about-desc-body">
            <p>
              {isAmharic
                ? 'ድርጅታችን ድርጅቶች በበለጠ ብልህነት፣ ፍጥነት እና ውጤታማነት እንዲሠሩ የሚያስችሉ ዘመናዊ፣ አስተማማኝ እና ፈጣን የሶፍትዌር ሥርዓቶችን ያለምጋል።'
                : 'We develop advanced, modern, and reliable digital systems designed to help businesses operate smarter, faster, and more efficiently.'}
            </p>
            <p>
              {isAmharic
                ? 'ዓላማችን የንግድ ሀሳቦችን ወደ ኃይለኛ የቴክኖሎጂ መፍትሔዎች በመቀየር የእለት ተእለት ሥራዎችን ማቃለል፣ ምርታማነትን ማሳደግ እና ለደንበኞችና ሠራተኞች የተሻለ ልምድ መስጠት ነው።'
                : 'Our goal is to transform business ideas into powerful technology solutions that simplify daily operations, improve productivity, and provide better experiences for customers and employees.'}
            </p>
            <p>
              {isAmharic
                ? 'በተለይም በዘመናዊ የንግድ አስተዳደር ሥርዓቶች፣ የላቦራቶሪ እና የጤና ሶፍትዌሮች፣ የዕቃ ክምችት አስተዳደር ፕላትፎርሞች እና የድርጅቶች ድር-አቀፍ መተግበሪያዎች ላይ እንሠራለን።'
                : 'We specialize in developing modern business management systems, laboratory and healthcare solutions, inventory and stock management platforms, enterprise applications, and customized software tailored to the unique needs of each organization.'}
            </p>
          </div>
          <div className="about-slogan-banner">
            <strong>
              {isAmharic
                ? 'ፈጠራ ያለው ቴክኖሎጂ። ብልህ መፍትሔዎች። የተሻለ የንግድ ዕድገት።'
                : 'Innovative Technology. Smart Solutions. Better Business.'}
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
}

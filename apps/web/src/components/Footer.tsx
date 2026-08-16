import Link from "next/link";

const FooterLink = ({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) => (
  <Link
    href={href}
    className="text-gray-300 hover:text-white transition-colors duration-200"
  >
    {children}
  </Link>
);

const SocialIcon = ({ href, icon }: { href: string; icon: string }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="text-gray-300 hover:text-white transition-colors duration-200"
  >
    <i className={`fab ${icon} text-xl`}></i>
  </a>
);

export default function Footer() {
  return (
    <footer className="bg-linear-to-r from-blue-600 to-purple-600 text-white py-8 z-10">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center md:text-left">
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <FooterLink href="/">Home</FooterLink>
              </li>
              <li>
                <FooterLink href="/quiz">Start Quiz</FooterLink>
              </li>
              <li>
                <FooterLink href="/flash-cards">Flash Cards</FooterLink>
              </li>
              <li>
                <FooterLink href="/study-materials">Study Materials</FooterLink>
              </li>
            </ul>
          </div>
          <div className="text-center md:text-left">
            <h3 className="text-lg font-semibold mb-4">Resources</h3>
            <ul className="space-y-2">
              <li>
                <FooterLink href="/faq">FAQ</FooterLink>
              </li>
              <li>
                <FooterLink href="/contact">Contact Us</FooterLink>
              </li>
              <li>
                <FooterLink href="/privacy-policy">Privacy Policy</FooterLink>
              </li>
              <li>
                <FooterLink href="/terms-of-service">
                  Terms of Service
                </FooterLink>
              </li>
            </ul>
          </div>
          <div className="text-center md:text-left">
            <h3 className="text-lg font-semibold mb-4">Connect With Us</h3>
            <div className="flex justify-center md:justify-start space-x-4">
              <SocialIcon href="https://facebook.com" icon="fa-facebook" />
              <SocialIcon href="https://twitter.com" icon="fa-twitter" />
              <SocialIcon href="https://instagram.com" icon="fa-instagram" />
              <SocialIcon href="https://linkedin.com" icon="fa-linkedin" />
            </div>
          </div>
        </div>
        <div className="mt-8 text-center">
          <p>
            &copy; {new Date().getFullYear()} Drone Pilot Quiz App. All rights
            reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

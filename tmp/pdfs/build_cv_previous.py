from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from pypdf import PdfReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
pdfmetrics.registerFont(TTFont('CVRegular','/System/Library/Fonts/Supplemental/Arial.ttf'))
pdfmetrics.registerFont(TTFont('CVBold','/System/Library/Fonts/Supplemental/Arial Bold.ttf'))
pdfmetrics.registerFontFamily('CVRegular',normal='CVRegular',bold='CVBold',italic='CVRegular',boldItalic='CVBold')
OUT='output/pdf/Agustin_Sobral_CV.pdf'
W,H=A4
c=canvas.Canvas(OUT,pagesize=A4)
c.setTitle('Agustín Sobral | Senior Mobile Developer')
c.setAuthor('Agustín Sobral')
ink='#2B2B2B';muted='#6E6E6E';accent='#3978B8'
c.setFillColor(HexColor('#FEFEFD'));c.rect(0,0,W,H,fill=1,stroke=0)
c.setFillColor(HexColor(accent));c.rect(0,H-10,W,10,fill=1,stroke=0)
x=43; width=W-86;y=H-43
styles={
 'body':ParagraphStyle('body',fontName='CVRegular',fontSize=9.5,leading=12.8,textColor=HexColor(ink)),
 'small':ParagraphStyle('small',fontName='CVRegular',fontSize=9,leading=12.5,textColor=HexColor(muted)),
 'role':ParagraphStyle('role',fontName='CVBold',fontSize=10.5,leading=14,textColor=HexColor(ink)),
}
def p(text,style='body',after=4):
 global y
 q=Paragraph(text,styles[style]);w,h=q.wrap(width,1000);q.drawOn(c,x,y-h);y-=h+after

def section(title):
 global y
 y-=6
 c.setFillColor(HexColor(accent));c.roundRect(x,y-10,4,10,2,fill=1,stroke=0)
 c.setFillColor(HexColor(ink));c.setFont('CVBold',9.2);c.drawString(x+12,y-9,title.upper());y-=20

def role(title,org,date):
 p(title,'role',1)
 p(f'{org} <font color="{muted}">| {date}</font>','small',4)

def bullet(t):
 p('•  '+t,after=3)

c.setFillColor(HexColor(ink));c.setFont('CVBold',28);c.drawString(x,y-27,'AGUSTÍN SOBRAL');y-=42
c.setFont('CVBold',14);c.drawString(x,y,'Senior Mobile Developer');y-=19
p('React Native &amp; TypeScript · Co-founder &amp; product builder','small',8)
p('Buenos Aires, Argentina · +54 11 5315 4680 · <link href="mailto:agustin@gurudevelopers.dev">agustin@gurudevelopers.dev</link>','small',1)
p('<link href="https://www.linkedin.com/in/agustinsobral">linkedin.com/in/agustinsobral</link>','small',8)
p('Senior Mobile Developer and software venture co-founder combining React Native expertise with full-stack delivery and a business mindset. Leads cross-platform development from architecture to release, collaborates across product and engineering, and mentors developers. Entrepreneurial experience spans project delivery, client relationships and mobile product development.',after=0)
section('Professional experience')
role('Senior React Native Developer','CiNKO · Remote','Jun 2023 - Present')
bullet('Lead cross-platform mobile development from architecture to release, building complex UI components and scalable TypeScript codebases.')
bullet('Integrate Firebase, Intercom and AppsFlyer SDKs; manage application state with Redux and optimize performance.')
bullet('Manage CI/CD pipelines and troubleshoot native iOS and Android issues, collaborating with product, design and backend teams.')
bullet('Contribute to architecture and code quality decisions, mentor junior developers and support technical planning.')
y-=4
role('Co-founder & Lead Developer','Gurudevelopers · Buenos Aires','Jan 2018 - Present')
bullet('Co-founded a software services venture delivering mobile apps, web platforms and backend solutions, connecting client needs with technical implementation.')
bullet('Led end-to-end project delivery while contributing across user interfaces, server-side logic and databases; managed client relationships and ongoing support.')
y-=4
role('BI Consultant & Web Developer','Freelance · Buenos Aires','Sep 2015 - Dec 2017')
p('Delivered full-stack corporate websites and e-commerce solutions. Built MicroStrategy dashboards and reports, and trained client teams.',after=3)
y-=4
role('BI Project Leader','INSSJP · Buenos Aires','May 2010 - Aug 2015')
p('Designed data warehouses and ETL processes; developed interactive dashboards and optimized SQL queries for business reporting.',after=0)
section('Product development')
p('Vibes <font face="CVRegular" color="#6E6E6E">| Mobile app project</font>','role',3)
p('Developing a React Native, Expo and TypeScript app for connections, community and wellbeing, spanning onboarding, discovery, messaging, events and multimedia experiences.',after=0)
section('Technical skills')
p('<b>Mobile &amp; frontend</b>  React Native · Expo · TypeScript · JavaScript · React · Redux',after=2)
p('<b>Backend &amp; data</b>  Node.js · Express · PHP · SQL · MySQL · Oracle · MongoDB · Firebase',after=2)
p('<b>Delivery &amp; analytics</b>  Git · CI/CD · CircleCI · Agile/Scrum · Jira · MicroStrategy',after=0)
section('Education & languages')
p('<b>Business Intelligence &amp; Data Mining</b> · Postgraduate studies<br/>Universidad Tecnológica Nacional · 2011',after=4)
p('<b>Business Administration</b> · Universidad Torcuato Di Tella · 2005 - 2008',after=5)
p('<b>Spanish</b> Native &nbsp;&nbsp; <b>English</b> Fluent',after=0)
print('Bottom y:',y)
assert y>28, y
c.save()
r=PdfReader(OUT)
print('Pages:',len(r.pages),'Words:',len(r.pages[0].extract_text().split()))

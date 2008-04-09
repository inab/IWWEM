#!/usr/bin/perl -W

# $Id$
# IWWEMproxy.pl
# from INB Interactive Web Workflow Enactor & Manager (IWWE&M)
# Author: José María Fernández González (C) 2007-2008
# Institutions:
# *	Spanish National Cancer Research Institute (CNIO, http://www.cnio.es/)
# *	Spanish National Bioinformatics Institute (INB, http://www.inab.org/)

use strict;

use Encode;
use FindBin;
use CGI;
use MIME::Base64;
use XML::LibXML;
#use File::Path;

use lib "$FindBin::Bin";
use WorkflowCommon;

use lib "$FindBin::Bin/LockNLog";
use LockNLog;

# Function prototypes
sub parseExpression($);
sub applyExpression($$;$);

# Web applications do need this!
$|=1;
	
my($query)=CGI->new();

my($jobId)=undef;
my($asMime)=undef;
my($step)=undef;
my($iteration)=undef;
my($IOMode)=undef;
my($IOPath)=undef;
my($bundle64)=undef;
my($withName)=undef;
my($charset)=undef;

# First step, parameter storage (if any!)
foreach my $param ($query->param()) {
	if($param eq 'jobId') {
		$jobId=$query->param($param);
	} elsif($param eq 'asMime') {
		$asMime=$query->param($param);
	} elsif($param eq 'step') {
		$step=$query->param($param);
	} elsif($param eq 'iteration') {
		$iteration=$query->param($param);
	} elsif($param eq 'IOMode') {
		$IOMode=$query->param($param);
	} elsif($param eq 'IOPath') {
		$IOPath=$query->param($param);
		$IOPath=undef  unless(length($IOPath)>0);
	} elsif($param eq 'charset') {
		$charset=$query->param($param);
		$charset=undef  unless(length($charset)>0);
	} elsif($param eq 'bundle64') {
		$bundle64=$query->param($param);
	} elsif($param eq 'withName') {
		$withName=$query->param($param);
	}
	
	# Error checking
	last  if($query->cgi_error());
}

# Second, parameter parsing
my($retval)=0;
my($bacio)=undef;
my(@path)=();
my($facet)=undef;
my($isExample)=undef;
my($origJobId)=$jobId;
if((!defined($IOPath) ||defined($asMime)) && defined($jobId)) {
	# Time to know the overall status of this enaction
	my($jobdir)=undef;
	my($wfsnap)=undef;
	
	if(index($jobId,$WorkflowCommon::SNAPSHOTPREFIX)==0) {
		if(index($jobId,'/')==-1 && $jobId =~ /^$WorkflowCommon::SNAPSHOTPREFIX([^:]+):([^:]+)$/) {
			$wfsnap=$1;
			$jobId=$2;
			$jobdir=$WorkflowCommon::WORKFLOWDIR .'/'.$wfsnap.'/'.$WorkflowCommon::SNAPSHOTSDIR.'/'.$jobId;
		}
	} elsif(index($jobId,$WorkflowCommon::EXAMPLEPREFIX)==0) {
		if(index($jobId,'/')==-1 && $jobId =~ /^$WorkflowCommon::EXAMPLEPREFIX([^:]+):([^:]+)$/) {
			$wfsnap=$1;
			$jobId=$2;
			$jobdir=$WorkflowCommon::WORKFLOWDIR .'/'.$wfsnap.'/'.$WorkflowCommon::EXAMPLESDIR;
			$isExample=1;
		}
	} else {
		# For completion, we handle qualified job Ids
		$jobId =~ s/^$WorkflowCommon::ENACTIONPREFIX//;
		$jobdir=$WorkflowCommon::JOBDIR . '/' .$jobId;
	}
	
	# Is it a valid job id?
	if(index($jobId,'/')==-1 && defined($jobdir) && -d $jobdir && -r $jobdir) {
		if(!defined($IOPath) || $asMime =~ /^[^ \/\n\t]+\/[^ \/\n\t]+/) {
			if(defined($bundle64)) {
				$retval=-1  unless(!defined($withName) || index($withName,'/')==-1);
			} else {
				my($targfile)=undef;
				if(defined($isExample)) {
					$targfile=$jobId.'.xml';
				} elsif($IOMode eq 'I') {
					$targfile=$WorkflowCommon::INPUTSFILE;
				} elsif($IOMode eq 'O') {
					$targfile=$WorkflowCommon::OUTPUTSFILE;
				}
				
				if(defined($targfile)) {
					# The pseudo XPath IOPath
					if(defined($IOPath) && length($IOPath)>0) {
						@path=split(/\//,$IOPath);
					}
					if(!defined($IOPath) || length($IOPath)==0 || scalar(@path)>0) {
						if(defined($withName) && length($withName)==0) {
							$withName=join('_',@path);
							$withName =~ s/\[([^\]]+)\]/-$1/g;
						}
						$facet=shift(@path) if(scalar(@path)>0);
						
						# Now, the physical path
						my($stepdir)=$jobdir;
						if(!defined($isExample) && defined($step) && length($step)>0 && $step ne $origJobId) {
							$stepdir .= '/Results/'.$step;
						} else {
							$step='';
							# Forcing iteration forgery avoidance
							$iteration=undef;
						}

						if(index($step,'/')==-1 && -d $stepdir && -r $stepdir) {
							my($iterdir)=$stepdir;
							if(defined($iteration) && length($iteration)>0) {
								$iterdir .= '/Iterations/'.$iteration;
							} else {
								$iteration='';
							}

							if(defined($iteration) && index($iteration,'/')==-1 && -d $iterdir && -r $iterdir) {
								my($bacfile)=$iterdir . '/' . $targfile;

								# We are going to parse!
								my($parser)=XML::LibXML->new();
								#$context->registerNs('s',$WorkflowCommon::SCUFL_NS);

								eval {
									$bacio=$parser->parse_file($bacfile);
								};

								if($@) {
									$retval="8, $@";
								}
							} else {
								$retval=7;
							}
						} else {
							$retval=6;
						}
					} else {
						$retval=5;
					}
				} else {
					$retval=4;
				}
			}
		} else {
			$retval=3;
		}
	} else {
		$retval=2;
	}
} else {
	$retval=1;
}

# We must signal here errors and exit
if($retval ne '0' || $query->cgi_error()) {
	my $error = $query->cgi_error;
	$error = '500 Internal Server Error'  unless(defined($error));
	print $query->header(-status=>$error),
		$query->start_html('IWWEMproxy Problems'),
		$query->h2('Request not processed because some parameter was not properly provided'.(($retval ne '0')?" (Errcode=$retval)":'')),
		$query->strong($error);
	exit 0;
}

my($dec)=undef;

if(defined($IOPath) && (length($IOPath)>0)) {
	my($retmesg)=undef;
	
	# Now it is time to work!
	my($pathi)=undef;
	unless(defined($bundle64)) {
		eval {
			my($context)=XML::LibXML::XPathContext->new();
			$context->registerNs('b',$WorkflowCommon::BACLAVA_NS);

			my($xpathfetch)="/b:dataThingMap/b:dataThing[\@key='$facet']/b:myGridDataDocument/";

			my($pathlength)=scalar(@path);
			for($pathi=$pathlength-1;$pathi>=0;$pathi--) {
				if(index($path[$pathi],'#')==0) {
					last;
				}
			}
			my($effpathlength)=($pathi>=0)?$pathi:$pathlength;
			if($effpathlength>0) {
				$xpathfetch .= 'b:partialOrder/b:itemList/';
				$effpathlength--;
				for(my $pathidx=0; $pathidx<$effpathlength; $pathidx++) {
					$xpathfetch .= "b:partialOrder[\@index='$path[$pathidx]']/b:itemList/";
				}
				$xpathfetch .= "b:dataElement[\@index='$path[$effpathlength]']";
			} else {
				$xpathfetch .= 'b:dataElement';
			}

			# Last step
			$xpathfetch .= '/b:dataElementData';
			my(@datanodes)=$context->findnodes($xpathfetch,$bacio);

			if(scalar(@datanodes)!=0) {
				$bundle64=$datanodes[0]->textContent();
			} else {
				$retmesg="XPath $xpathfetch not found";
			}
		};

		if($@) {
			if(defined($retmesg)) {
				$retmesg .= "\n".$@;
			} else {
				$retmesg=$@;
			}
		}
	}

	# We must signal here late errors
	if(defined($retmesg)) {
		print $query->header(-status=> '404 Not Found'),
			$query->start_html('IWWEMproxy Problems'),
			$query->h2('Request not processed because '.$retmesg);
		exit 0;
	}

	# And now, decoding
	$dec=decode_base64($bundle64);

	# Do we have to do further processing?
	if($pathi!=-1) {
		# We are going to parse!
		my($parser)=XML::LibXML->new();
		my($context)=XML::LibXML::XPathContext->new();
		$context->registerNs('pat',$WorkflowCommon::PAT_NS);
		#$context->registerNs('s',$WorkflowCommon::SCUFL_NS);

		my($docpat);
		eval {
			$docpat=$parser->parse_file($WorkflowCommon::PATTERNSFILE);
		};
		unless($@) {
			my($pathlength)=scalar(@path);
			for(;$pathi<$pathlength;$pathi++) {
				if($path[$pathi] =~ /^#([^\[\]]+)\[([0-9]+)\]$/) {
					my($patternName)=$1;
					my($match)=$2;

					unless(ref($dec)) {
						eval {
							$dec=$parser->parse_string($dec);
						};

						if($@) {
							last;
							$dec=undef;
						}
					}

					my(@patnodes)=$context->findnodes("//pat:detectionPattern[\@name='$patternName']",$docpat);
					last  if(scalar(@patnodes)!=1);

					my($expression)=undef;
					my($extractStep)=undef;

					foreach my $expr ($patnodes[0]->childNodes()) {
						if($expr->nodeType==XML::LibXML::XML_ELEMENT_NODE) {
							my($tagname)=$expr->localName();
							if(!defined($expression) && $tagname eq 'expression') {
								$expression=parseExpression($expr);
							} elsif(!defined($extractStep) && $tagname eq 'extractionStep') {
								$extractStep=parseExpression($expr);
							}
						}
					}

					last  unless(defined($expression) && defined($extractStep));
					my($matched)=applyExpression($expression,$dec,$match);
					$dec=applyExpression($extractStep,$matched);
					last  unless(defined($dec));
				} else {
					last;
				}
			}

			$dec=$dec->textContent()  if(ref($dec));
		}
	}
} elsif(defined($bundle64)) {
	print $query->header(-status=> '404 Not Found'),
		$query->start_html('IWWEMproxy Problems'),
		$query->h2('Request not processed because outputs listing cannot be got from a Base64 bundle');
	exit 0;
} else {
	# Generating output listing
	my $outputDoc = XML::LibXML::Document->createDocument('1.0','UTF-8');
	my($root)=$outputDoc->createElementNS($WorkflowCommon::WFD_NS,'dataBundle');
	$root->setAttribute('time',LockNLog::getPrintableNow());
	$root->setAttribute('uuid',$origJobId);
	unless(defined($isExample)) {
		$root->setAttribute('flow',(($IOMode eq 'I')?'Inputs':'Outputs'));
		$root->setAttribute('step',$step)  if(defined($step) && length($step)>0);
		$root->setAttribute('iteration',$iteration)  if(defined($iteration) && length($iteration)>0);
	}
	$root->appendChild($outputDoc->createComment($WorkflowCommon::COMMENTWM));
	$outputDoc->setDocumentElement($root);
	
	# TODO
	eval {
		my($context)=XML::LibXML::XPathContext->new();
		$context->registerNs('b',$WorkflowCommon::BACLAVA_NS);
		$context->registerNs('s',$WorkflowCommon::XSCUFL_NS);
		my(@facets)=$context->findnodes('/b:dataThingMap/b:dataThing',$bacio);
		foreach my $facet (@facets) {
			my($outnode)=$outputDoc->createElementNS($WorkflowCommon::WFD_NS,'output');
			$outnode->setAttribute('name',$facet->getAttribute('key'));
			my(@mimes)=$context->findnodes('.//s:mimeType/text()',$facet);
			push(@mimes,$outputDoc->createTextNode('text/plain'))  if(scalar(@mimes)==0);
			foreach my $mime (@mimes) {
				my($mimeNode)=$outputDoc->createElementNS($WorkflowCommon::WFD_NS,'mime');
				$mimeNode->appendChild($outputDoc->createTextNode($mime->textContent()));
				$outnode->appendChild($mimeNode);
			}
			$root->appendChild($outnode);
		}
	};
	
	if($@) {
		print $query->header(-status=> '404 Not Found'),
			$query->start_html('IWWEMproxy Problems'),
			$query->h2('Request not processed because '.$@);
		exit 0;
	} else {
		$charset='UTF-8';
		$dec=encode($charset,$outputDoc->toString());
		$asMime='application/xml';
		$withName=undef;
	}
}

$dec=''  unless(defined($dec));

my(@headerPars)=(-type=>$asMime,-expires=>'+60s');
push(@headerPars,-charset=>'UTF-8')  if(defined($charset));

# Guessing the extension
if(defined($withName)) {
	my($grepline)='grep \'^'.$asMime.'[[:space:]\]\+\w\+\' /etc/mime.types';
	my($ext)=($asMime eq 'text/xml')?'xml':`$grepline`;
	chomp($ext);
	if(defined($ext) && length($ext)>0) {
		$ext =~ s/^[^ \t]+[ \t]+//;
		$ext =~ s/[ \t]+.+$//;
		$withName .= ".$ext"  if(length($ext)>0);
	}
	push(@headerPars, -attachment=>$withName);
}

print $query->header(@headerPars);

print $dec;

exit 0;
# Function bodies

sub parseExpression($) {
	my($theDOM)=@_;
	my(%expression)=();
	
	if($theDOM->hasAttribute('encoding') && $theDOM->getAttribute('encoding') eq 'base64') {
		$expression{'base64'}=undef;
	}
	
	if($theDOM->hasAttribute('dontExtract') && $theDOM->getAttribute('dontExtract') eq 'true') {
		$expression{'dontExtract'} = undef;
	}
	
	foreach my $child ($theDOM->childNodes()) {
		if($child->nodeType==XML::LibXML::XML_ELEMENT_NODE) {
			my($exptype)=$child->localName();
			if($exptype eq 'xpath') {
				$expression{'xpath'}=$child->getAttribute('expression');
				my($nsMapping)={};
				foreach my $ns ($child->childNodes()) {
					if($ns->nodeType==XML::LibXML::XML_ELEMENT_NODE && $ns->localName() eq 'nsMapping') {
						$nsMapping->{$ns->getAttribute('prefix')}=$ns->getAttribute('ns');
					}
				}
				$expression{'nsMapping'}=$nsMapping;
			} elsif($exptype eq 'reExpression') {
				my($pa)=$child->textContent();
				$expression{'RE'} = (!defined($pa))?'':$pa;
			}
		}
	}
	
	return \%expression;
}

sub applyExpression($$;$) {
	my($expression,$data,$numres)=@_;
	
	$numres=0  unless(defined($numres));
	
	my(@res)=();
	my($retval)=undef;
	
	if(defined($data)) {
		if(exists($expression->{'RE'})) {
			if(defined($expression->{'RE'})  && $expression->{'RE'} ne '') {
				$data=$data->textContent()  if(ref($data));
				@res = $data =~ /$expression->{'RE'}/g;
			} else {
				push(@res,$data);
			}
		} else {
			my($context)=XML::LibXML::XPathContext->new();
			my($prefix,$ns);
			while(($prefix,$ns)=each(%{$expression->{'nsMapping'}})) {
				$context->registerNs($prefix,$ns);
			}
			unless(ref($data)) {
				my($parser)=XML::LibXML->new();
				eval {
					$data=$parser->parse_string($data);
				};
				if($@) {
					$data=undef;
				}
			}
			
			if(defined($data)) {
				@res=$context->findnodes($expression->{'xpath'},$data);
			}
		}
	}
	
	if($numres<scalar(@res)) {
		$retval=exists($expression->{'dontExtract'})?$data:$res[$numres];
		if(exists($expression->{'base64'})) {
			$retval=$retval->textContent()  if(ref($retval));
			$retval=decode_base64($retval);
		}
	}
	
	return $retval;
}
